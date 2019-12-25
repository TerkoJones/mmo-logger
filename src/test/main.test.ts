import log, { registerLogger, contextualize } from '../index';


const data = {
    a: 1,
    b: 2,
    c: {
        c1: 31,
        c2: 32
    }
}


registerLogger({
    'err': {
        output: 'stderr',
        prompt: 'Error'
    },
    'warn': {
        output: 'logger.log',
        prompt: "Warn",
        date: 'DA-MO-YE',
        depth: 0,
        compact: false,
        colors: true
    }
});

const o = {
    name: 'Pedro',
    age: 25,
    ob: {
        a: 1,
        b: 2,
        c: 3
    }
}

log("Logger principal");
log.err("Logger de error")
const ctx = contextualize(o);
const msg = "%name tiene %age años: %ob %d";
log.warn(ctx, msg, 25);