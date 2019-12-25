# mmo-logger
Logeador básico.

## Uso
```javascript
    // importa sólo la función-objeto de logueo.
    import log from "mmo-logger"
    // Importa además la dos funciones auxiliares para crear contextos y nuevos loggers.
    import log, { registerLogger, contextualize } from 'mmo-logger';
```

## Función-Objeto `log`
Función de logeo principal cuyos miembros son los distintos loggers definidos. La sintáxis tanto de esta como de sus miembros responde a:
```javascript
    log(message, ...args);
    log(context, message, ...args);
```
* `message`: Mensaje a mostrar con los marcadores de posición tanto para los datos del contexto(si lo hay) como para el resto de argumentos.
* `context`: Objeto creado mediante `contextualize` y cuya información se puede insertar en el mensaje mediante los marcadores de posición del tipo %key
* `args`: Argumentos extras para insertar en el mensaje mediante marcadores de posición tal y como lo hace `util.format`. 
NOTA: Los nombres de sus métodos se corresponden exactamente con los dados en la creación de los mimos.

## Función `registrerLogger`.
Permite la definición de nuevos loggers.
```ts
    registerLogger(name: string, output?: string): void;
    registerLogger(name: string, options?: LoggerOptions): void;
    registerLogger(defs: LoggerDefs);
```
* `name`: Nombe que identificará el logger en la función-objeto `log`.
* `options`: Opciones de configuración. `LoggerOptions`
* `defs`: Objeto de definición del tipo id_logger:`LoggerOptions`. 

## `LoggerOptions`
Opciones para la definición de un logger. Además de las mostradas se extiende con las propias de `util.InspectOptions` para definir como se mostrarán los datos.
```ts
    encoding?: string,                  // codificación salida.
    flags?: string                      // flags para el stream creado('a' append, 'w' create )
    prompt?: string,                    // Prefijo de cada mensaje.
    output: string                      // Ruta de salida, stdout o stderr
    date?: string | (() => string)      // Cadena de formato de fecha o función que devuelve fecha actual formateda a texto.
```

## Función `contextualize`
Devuelve una copia superficial del objeto pasado marcada como contexto.
```ts
    let context= contextualize(obj);
```

## Ejemplo
```ts
import log, { registerLogger, contextualize } from '../index';

//log viene predefinido pero se puede redefinir mediante registerLogger.
log("Mensaje %d", 1);
// Mensaje 1

// Crea dos loggers mas.
registerLogger({
    'err': {
        output: 'stderr', // Salida de error standar
        prompt: 'Error'
    },
    'warn': {
        output: 'logger.log', // Archivo de salida
        prompt: "Warn",
        date: 'DA-MO-YE',     // Formato para la fecha actual
        depth: 0,             // ... optiones de util.inspect
        compact: false,
        colors: true
    }
});


log.err("¡¡¡Al loro!!!");
// Error: ¡¡¡Al loro!!!

const data = {
    name: 'Pedro',
    age: 25,
    info: {
        casa: 1,
        perro: 0
    }
}

const context = contextualize(data);
log.warn(context, "%name tiene %age años: %info y %d€", 25);
// Warn[03-11-2019]:'Pedro' tiene 25 años: {
//   casa: true,
//   perro: false
// } y 25€
log.warn(context, "%name tiene %age años, casas: %info.casa, perros:%info.perro y %d€", 25);
// Warn[03-11-2019]:'Pedro' tiene 25 años, casas: 1, perros:0 y 25€

```