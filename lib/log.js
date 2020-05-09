//Configuração de Logs padrão

const logs = require('./utils/logs');
const xHandleExceptions = false;
const xLog = logs();

// @ts-ignore
xLog.addFile({
    filename: './logs/error.log',
    level: 'warn',
    handleExceptions: xHandleExceptions,
    maxsize: 5242880
});

// @ts-ignore
xLog.addFile({
    filename: './logs/all.log',
    level: 'info',
    handleExceptions: xHandleExceptions,
    maxsize: 5242880
});

if (process.env.NODE_ENV !== 'production') {
    // @ts-ignore
    xLog.addConsole({
        level: 'silly',
        handleExceptions: xHandleExceptions
    });

    // @ts-ignore
    xLog.addFile({
        filename: './logs/all_console.log',
        level: 'silly',
        handleExceptions: xHandleExceptions,
        maxsize: 5242880
    });
}

module.exports = xLog;
