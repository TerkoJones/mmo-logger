import {
    formatWithOptions as format,
    InspectOptions,
    inspect
} from 'util';
import {
    Writable,
    WritableOptions
} from 'stream'
import {
    createContext,
    runInContext
} from 'vm';

import * as fs from 'fs';
import * as path from 'path';

type Dictionary<T> = {
    [key: string]: T
}

/**
 * Propiedades comúnes para LoggerOptions y LoggerInfo 
 */
interface LoggerBase extends InspectOptions {
    encoding?: string,
    flags?: string
    prompt?: string,
}

/**
 * Información que se pasa para definir un logger.
 */
interface LoggerOptions extends LoggerBase {
    output: string
    date?: string | (() => string)
}

/**
 * Tipo que permite definir un logger.
 */
type LoggerDefs = Dictionary<LoggerOptions | string>;


/**
 * Información asociada a un logger.
 */
interface LoggerInfo extends LoggerBase {
    writer: Writable,
    date?: () => string
}


/**
 * Marcador para diferenciar un objeto de contexto de un objeto a mostrar.
 */
const $CONTEXT = Symbol('Context');


interface Context {
    [$CONTEXT]: boolean,
    [key: string]: any,
}

/**
 * Función de logueo.
 */
interface LoggerFunction {
    (message?: string, ...args: any[]): void;
    (context?: Context, message?: string, ...args: any[]): void;
}

/**
 * Juego de funciones de logeo.
 */
interface Logger extends LoggerFunction {
    [key: string]: LoggerFunction
}


type WriterStore = Dictionary<Writable>;

type LoggerStore = Dictionary<LoggerInfo>;




const ENTRY_FOLDER = process.cwd();
const DEFAULT_LOGGER_NAME = 'log';

// Contantes para el analisis de plantillas de fecha.
const CREATE_PROPERTY = 'extend';
const DATE_PLACEHOLDERS = {
    DA: 'getDay',
    MO: 'getMonth',
    YE: 'getFullYear',
    HO: 'getHours',
    MI: 'getMinutes',
    SE: 'getSeconds',
    ML: 'getMilliseconds'
}
const REX_PROPS = /[A-Z][A-Z]+/g

// Expresión para la extracción de marcadores de posición %<var>
const REX_PH = /%%|%([\s\u0021-\u0024\u0026-\u01ff]|%{2,})+%/g

/**
 * Registro de Writables
 */
const WRITERS: WriterStore = {
    stdout: process.stdout,
    stderr: process.stderr
}

/**
 * Registro de Loggers
 */
const LOGGERS: LoggerStore = {
    [DEFAULT_LOGGER_NAME]: {
        writer: process.stdout,
        colors: true
    }
}

const DEFAULT_OPTIONS: LoggerBase = {
    encoding: 'utf8'
};


/**
 * Función que monta el mensaje del logger y lo escribe. Se enlaza con un objeto LoggerInfo para obtener las funciones de logueo.
 * @param {LoggerInfo}          this        Información básica del logger. 
 * @param {string|Context}      message     Mensaje u objeto de contexto.
 * @param {string[]}            args        Argumentos de sustitución(si message es Context) el primer elemento se
 *                                          toma como mensaje. 
 */
function write(this: LoggerInfo, message?: string | Context, ...args: any[]) {
    let prev = '';
    if (this.prompt) prev = this.prompt;
    if (this.date) prev += '[' + this.date() + ']';
    if (prev) prev += ':'
    if (message) {
        if (message[$CONTEXT]) {
            const context = message as Context;
            message = args.shift() as string;
            if (message) message = parse_context(context, message, this);
        }
    } else {
        message = '';
    }
    this.writer.write(format(this, prev + message + '\n', ...args));
}

/**
 * Función-Objeto principal de logueo.
 */
const logger: Logger = write.bind(LOGGERS[DEFAULT_LOGGER_NAME]);


/**
 * Crea un nuevo tipo de logger o modifica uno ya existente.
 * @param {string}                  alias       Nombre con que se referenciará el logger como miembro de la función-objeto principal. 
 * @param {string|LoggerOptions}    options     Si string, la ruta de salida para el logger(inc. stderr/stdout), si no opciones.
 */
function register_logger(alias: string, options: LoggerOptions | string): void {
    let output: string;
    if (typeof options === 'string') {
        options = {
            output: options
        } as LoggerOptions;
    }
    output = options.output;
    let cur = LOGGERS[alias];
    if (cur) {
        Object.assign(cur, {
            writer: register_writer(output, options)
        }, options);
    } else {
        cur = LOGGERS[alias] = <LoggerInfo>Object.assign({
            writer: register_writer(output, options as LoggerOptions)
        }, DEFAULT_OPTIONS, options); //:)>
        Object.defineProperty(logger, alias, {
            value: write.bind(LOGGERS[alias]),
            enumerable: true,
            writable: false,
            configurable: false
        })
    }
    if (typeof options.date === 'string') cur.date = parse_date(options.date);
    if (cur.colors === undefined) {
        cur.colors = (output === 'stdout' || output === 'stderr');
    } else {
        cur.colors = (output === 'stdout' || output === 'stderr') ? cur.colors : false;
    }

}


/**
 * Crea un stream de escritura o devuelve el ya creado si existe.
 * @param {string}              pathname      Ruta de salida para el writable(si es relativa se resuelve con ENTRY_FOLDER)-
 * @param {LoggetOptions}       options       Opciones para el WriteStream creado.
 */
function register_writer(pathname: string, options: LoggerOptions): Writable {
    if (pathname === 'stderr' || pathname === 'stdout') return WRITERS[pathname]; //:)>
    if (!path.isAbsolute(pathname)) pathname = path.resolve(ENTRY_FOLDER, pathname);
    if (WRITERS[pathname]) return WRITERS[pathname];
    return WRITERS[pathname] = fs.createWriteStream(pathname, options);
}


/**
 * Devuelve un función si parámetros que devuelve la fecha y hora actual formateada según la plantilla.
 * @param {string}      template    plantilla para el formateado de fechas. 
 */
function parse_date(template) {
    return () => {
        const date = new Date(Date.now());
        REX_PROPS.lastIndex = 0;
        return template.replace(REX_PROPS, (m: string) => {
            if (m.length === 2) {
                const prop = DATE_PLACEHOLDERS[m];
                if (prop) {
                    let val: string = date[prop]().toString();
                    val = m === 'Milliseconds' ? val.padStart(3, '0') : val.padStart(2, '0');
                    return val;
                }
            }
            return m;
        })
    }
}

/**
 * 
 * @param {Context}         context     Objeto con la información a insertar. 
 * @param {string}          message     Mensaje con los marcadores de posición para insertar la información de context.
 * @param {InspectOptions}  options 
 */
function parse_context(context: any, message: string, options?: InspectOptions) {
    REX_PH.lastIndex = 0;
    return message.replace(REX_PH, (m: string) => {
        if (m === '%%') return '%';
        return parse_key(context, m.substr(1, m.length - 2));
    })
}


function parse_key(sandbox, expr) {

    expr = '(' + expr.replace('%%', '%') + ')';
    return runInContext(expr, sandbox);
}



/**
 * Función-Objeto de logueo.
 */
export default logger;

/**
 * Registra o actualiza loggers.
 */
export function registerLogger(name: string, output?: string): void;
export function registerLogger(name: string, options?: LoggerOptions): void;
export function registerLogger(defs: LoggerDefs);
export function registerLogger(name: string | LoggerDefs, options?: LoggerOptions | string): void {
    if (typeof name === 'string') {
        register_logger(name, options);
    } else {
        for (let k in name as LoggerDefs) register_logger(k, name[k]);
    }
}
/**
 * Devuelve un objeto como el pasado marcado como contexto.
 */
export function contextualize(obj: object): Context {
    return <Context>createContext(Object.assign({
        [$CONTEXT]: true
    }, obj));
}
