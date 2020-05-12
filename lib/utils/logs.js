// process.env.NODE_ENV = 'production';
/*
 * Exibe log no console quando não for produção
 *
 * Before running your app, you can do this in console,
 * export NODE_ENV=production
 *
 * Or if you are in windows you could try this:
 * SET NODE_ENV=production
 *
 * or you can run your app like this:
 * NODE_ENV=production node app.js
 *
 * You can also set it in your js file:
 * process.env.NODE_ENV = 'production';
 */
const { createLogger, format, transports, addColors } = require('winston');
const { timestamp, colorize, prettyPrint } = format;
const { formatDateCustom } = require('investira.sdk').formats;
const { isObject } = require('investira.sdk').validators;

const customLevels = {
    levels: {
        emerg: 0,
        error: 1,
        warn: 2,
        note: 3,
        info: 4,
        debug: 5,
        verbose: 6,
        silly: 7
    },
    colors: {
        emerg: 'white bgRed',
        error: 'red',
        warn: 'yellow',
        note: 'green',
        info: 'white',
        debug: 'cyan',
        verbose: 'blue',
        silly: 'magenta'
    }
};

//Configura cores
addColors(customLevels.colors);

/**
 * Formatação do stacktrace
 *
 * @param {*} pInfo
 * @returns
 */
const errorObject = format((pInfo, pArg) => {
    const {
        level,
        name,
        message,
        description,
        status,
        code,
        showStack,
        stack,
        isBasicMessage,
        isBasicMessageError,
        ...xInfo
    } = pInfo;

    //Resultado padrão
    const xResult = { level, message };
    //Recupera RequestContext global se existir
    const xRC = getRCId();
    if (xRC) {
        xResult.rc = xRC;
    }

    if (isBasicMessage) {
        xResult.message = description;
        //Código do erro
        if (code) {
            xResult.code = code;
        }
    }

    //Força a exibição do stack
    if (stack && level === 'error' && (showStack || !isBasicMessage)) {
        xResult.message = stack;
    } else {
        xResult.message = message || description;
    }
    //Transforma objeto em json
    if (isObject(xResult.message)) {
        xResult.message = JSON.stringify(xResult.message);
    }
    return Object.assign({}, xInfo, xResult);
    // if (pInfo.isBasicMessage) {
    //     if (isBasicMessageError) {
    //         xInfo.error = { ...xResult, code };
    //     } else {
    //         xInfo.message = { ...xResult, code };
    //     }
    //     return Object.assign({}, xInfo);
    //     //Procura mais informações do stack
    // } else if (pInfo instanceof Error) {
    //     //return Object.assign({}, {error:pInfo}, { description: pInfo.stack });
    //     return Object.assign({}, { error: pInfo }, { stack: pInfo.stack });
    //     //@ts-ignore
    // } else if (pInfo.message instanceof Error) {
    //     return Object.assign({}, { error: pInfo }, { stack: pInfo.message.stack });
    //     //Se mensagem for um objeto, exibe seu conteúdo
    // } else if (isObject(pInfo.message)) {
    //     //     // @ts-ignore
    //     //     //const xMsg = pInfo.message.data || JSON.stringify(pInfo.message, null, 2);
    //     return Object.assign({}, { error: pInfo }, { stack: pInfo.message });
    //     // return Object.assign({}, pInfo, {
    //     //     message: JSON.stringify(pInfo.message, null, 2)
    //     // });
    // } else if (pInfo.message) {
    //     const { message, stack, ...xInfo } = pInfo;
    //     return Object.assign({}, xInfo, { error: { description: message, stack } });
    // } else {
    //     return Object.assign({}, pInfo, { error: { description: '' } });
    // }
});

/**
 * Recupera o RequestContext Id se existir
 *
 * @returns {number}
 */
const getRCId = () => {
    try {
        // @ts-ignore
        if (gRC) {
            //@ts-ignore
            if (gRC.hasOwnProperty('hasContext') && gRC.hasContext()) {
                //@ts-ignore
                const xRID = gRC.get('reqId');
                if (xRID) {
                    return xRID;
                }
            }
        }
    } catch (err) {}
    return null;
};

/**
 * Formatação para o console
 */
const consoleFormat = format.combine(
    errorObject(),
    colorize(),
    timestamp(),
    prettyPrint(),
    format.printf(pInfo => {
        const { timestamp, level, message, code, rc, detail, ...args } = pInfo;
        let xCode = '';
        if (code) {
            xCode = `[${code.status || '0'}.${code.source || '0'}.${code.ref || '0'}] `;
        }
        const xTime = formatDateCustom(new Date(timestamp), 'YYYY-MM-DD HH:mm:ss');
        let xRC = '';
        if (rc) {
            xRC = `[${rc}]`;
        }
        return `${xTime} [${level}]:\t${xRC}${xCode}${message}`;
    })
);

/**
 * Formatação para o console
 */
const fileFormat = format.combine(errorObject(), timestamp(), prettyPrint());

function logs(pLoggerToClone) {
    const xLogger = createLogger({
        levels: customLevels.levels,
        exitOnError: false,
        format: format.combine(format.errors({ stack: true }), format.json()) //format.metadata()
    });

    // @ts-ignore
    //Log de arquivo
    xLogger.addFile = pOptions => {
        const { prettyPrint, ...xOptions } = pOptions;
        xLogger.add(
            new transports.File({
                // format: prettyPrint ? format.combine(fileFormat, prettyPrint()) : fileFormat,
                format: fileFormat,
                maxsize: 5242880,
                handleExceptions: false,
                ...xOptions
            })
        );
    };

    // @ts-ignore
    //Log no console
    xLogger.addConsole = pOptions => {
        const { prettyPrint, ...xOptions } = pOptions;
        xLogger.add(
            new transports.Console({
                format: consoleFormat,
                level: 'silly',
                handleExceptions: false,
                ...xOptions
            })
        );
    };

    /**
     * Copia todos os transports de um logger para este
     *
     */
    // @ts-ignore
    xLogger.clone = pLogger => {
        for (const xTrans of pLogger.transports) {
            xLogger.add(xTrans);
        }
    };

    if (pLoggerToClone) {
        // @ts-ignore
        xLogger.clone(pLoggerToClone);
    }
    return xLogger;
}

//Cria logger
// const logger = winston.createLogger({
//     levels: customLevels.levels,
//     format: fileFormat,
//     exitOnError: false,
//     transports: [
//         new winston.transports.File({
//             filename: './logs/error.log',
//             level: 'warn',
//             handleExceptions: xHandleExceptions,
//             maxsize: 5242880
//         }),
//         new winston.transports.File({
//             filename: './logs/all.log',
//             level: 'info',
//             handleExceptions: xHandleExceptions,
//             maxsize: 5242880
//         })
//     ]
// });

module.exports = logs;
