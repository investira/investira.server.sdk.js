//Configuração de Logs padrão

const logs = require('./utils/logs');

const xHandleExceptions = false;
const xLog = logs();

let xLevel = 'info';
//Ativa logo no console
if (process.env.NODE_ENV !== 'production') {
    // @ts-ignore
    xLog.addConsole({
        level: 'silly',
        handleExceptions: xHandleExceptions
    });
    //COnfigura log do arquivo
    xLevel = 'silly';
}

//Log de tudo
// @ts-ignore
xLog.addFile({
    filename: './logs/all.log',
    level: xLevel,
    handleExceptions: xHandleExceptions,
    maxsize: 5242880
});

// @ts-ignore
//Log somente dos errors
// xLog.addFile({
//     filename: './logs/error.log',
//     level: 'warn',
//     handleExceptions: xHandleExceptions,
//     maxsize: 5242880
// });

module.exports = xLog;
