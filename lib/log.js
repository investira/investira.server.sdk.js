//Configuração de Logs padrão

const logs = require('./utils/logs');

const xHandleExceptions = false;
const xLog = logs();

let xLevelLimit = 'info';

//Ativa logo no console
if (process.env.NODE_ENV !== 'production') {
    // @ts-ignore
    xLog.addConsole({
        level: 'silly',
        handleExceptions: xHandleExceptions
    });
    //Configura log do arquivo
    xLevelLimit = 'silly';
} else {
    // @ts-ignore
    //Log somente dos errors
    xLog.addFile({
        filename: './logs/error.log',
        level: 'error',
        handleExceptions: xHandleExceptions,
        maxsize: 5242880
    });
}

//Log de tudo
// @ts-ignore
xLog.addFile({
    filename: './logs/all.log',
    level: xLevelLimit,
    handleExceptions: xHandleExceptions,
    maxsize: 5242880
});

module.exports = xLog;
