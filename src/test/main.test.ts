import log, { registerLogger, contextualize } from '../index';

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

const data = {
    name: 'Pedro',
    age: 25,
    info: {
        casa: 1,
        perro: 0
    }
}

log.err("Micasa %d", 25)



