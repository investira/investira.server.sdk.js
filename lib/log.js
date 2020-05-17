//Configuração de Logs padrão

const logs = require('./utils/logs');

const xHandleExceptions = false;
const log = pOptions => {
    pOptions = { rotate: { maxFiles: 30 }, ...pOptions };
    const xLog = logs(pOptions);
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
            filename: './logs/errors.log',
            level: 'error',
            handleExceptions: xHandleExceptions
        });
    }

    //Log de tudo
    // @ts-ignore
    xLog.addRotate({
        filename: './logs/%DATE%.log',
        auditFile: './logs/rotate_audit.log',
        level: xLevelLimit,
        handleExceptions: xHandleExceptions
    });
    return xLog;
};

module.exports = log;
