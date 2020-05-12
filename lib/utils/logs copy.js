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
const { timestamp, colorize, label, prettyPrint } = format;
const { isObject, isEmpty } = require('investira.sdk').validators;
// const { toDate } = require('investira.sdk').dates;
const { formatDateCustom } = require('investira.sdk').formats;
const { BasicMessage } = require('investira.sdk').messages.BasicMessages;

// const winston = require('winston');
// const { format } = winston;

// const logger = winston.createLogger({
//     format: format.combine(format.errors({ stack: true }), format.metadata(), format.json()),
//     transports: [new winston.transports.Console()]
// });

// logger.error(new Error('FakeError'));

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
const errorStackFormat = format((pInfo, args) => {
    //Por MessageError ser um error resolvido internamente,
    //as informações para exibição no log, são reduzidas.
    if (pInfo.isBasicMessage) {
        const {
            code,
            status,
            name,
            desciption,
            isBasicMessage,
            description,
            message,
            stack,
            isBasicMessageError,
            isBasicMessageSuccess,
            ...xInfo
        } = pInfo;
        const x = { code, description, name };
        if (isBasicMessageError) {
            xInfo.error = { code, description, name };
        } else {
            xInfo.message = { code, description, name };
        }
        return Object.assign({}, xInfo);
        //Procura mais informações do stack
    } else if (pInfo instanceof Error) {
        //return Object.assign({}, {error:pInfo}, { description: pInfo.stack });
        return Object.assign({}, { error: pInfo }, { stack: pInfo.stack });
        //@ts-ignore
    } else if (pInfo.message instanceof Error) {
        return Object.assign({}, { error: pInfo }, { stack: pInfo.message.stack });
        //Se mensagem for um objeto, exibe seu conteúdo
    } else if (isObject(pInfo.message)) {
        //     // @ts-ignore
        //     //const xMsg = pInfo.message.data || JSON.stringify(pInfo.message, null, 2);
        return Object.assign({}, { error: pInfo }, { stack: pInfo.message });
        // return Object.assign({}, pInfo, {
        //     message: JSON.stringify(pInfo.message, null, 2)
        // });
    } else if (pInfo.message) {
        const { message, stack, ...xInfo } = pInfo;
        return Object.assign({}, xInfo, { error: { description: message, stack } });
    } else {
        return Object.assign({}, pInfo, { error: { description: '' } });
    }
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

const infoRC = format((info, _opts = {}) => {
    //RequestContext
    const xRC = getRCId();
    if (xRC) {
        info.rc = xRC;
    }

    return info;
});

/**
 * Formatação para o console
 */
const consoleFormat = format.combine(
    errorStackFormat(),
    colorize(),
    timestamp(),
    prettyPrint(),
    format.printf(pInfo => {
        const { timestamp, level, message, error, ...args } = pInfo;
        let xCode = '';
        const xBasicMessage = message || error;
        if (xBasicMessage.code) {
            xCode = `[${xBasicMessage.code.status || '0'}.${xBasicMessage.code.source || '0'}.${
                xBasicMessage.code.ref || '0'
            }] ${xBasicMessage.name} `;
        }
        const xTime = formatDateCustom(new Date(timestamp), 'YYYY-MM-DD HH:mm:ss');
        const xRID = getRCId();
        const xDescription = xBasicMessage.description || '';
        let xStack = '';
        if (xBasicMessage.stack) {
            xStack = `\n\r${xBasicMessage.stack}`;
        }
        return `${xTime} [${level}]:\t${xRID ? [xRID] : ''}${xCode}${xDescription}${xStack}`;
    })
);

/**
 * Formatação para o console
 */
const fileFormat = format.combine(errorStackFormat(), timestamp(), prettyPrint(), infoRC());

function logs(pLoggerToClone) {
    const xLogger = createLogger({
        levels: customLevels.levels,
        exitOnError: false,
        format: format.combine(format.errors({ stack: true }), format.json())
    });

    // @ts-ignore
    //Log de arquivo
    xLogger.addFile = pOptions => {
        xLogger.add(
            new transports.File({
                format: fileFormat,
                maxsize: 5242880,
                // handleExceptions: false,
                ...pOptions
            })
        );
    };

    // @ts-ignore
    //Log no console
    xLogger.addConsole = pOptions => {
        xLogger.add(
            new transports.Console({
                format: consoleFormat,
                ...pOptions,
                //format: format.combine(format.splat(), format.simple()),
                level: 'silly',
                handleExceptions: true
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
