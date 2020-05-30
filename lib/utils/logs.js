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
const { timestamp, colorize, prettyPrint, json } = format;
const { formatDateCustom } = require('investira.sdk').formats;
const { isObject } = require('investira.sdk').validators;

require('winston-daily-rotate-file');

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
const errorObject = format((pInfo, _pArg) => {
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
        // @ts-ignore
        xResult.message = message.stack || stack;
    } else {
        // @ts-ignore
        xResult.message = message.message || message || description;
    }
    //Transforma objeto em json
    if (isObject(xResult.message)) {
        xResult.message = JSON.stringify(xResult.message);
    }
    return Object.assign({}, xInfo, xResult);
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
        const { timestamp, level, message, code, rc } = pInfo;
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
const fileFormat = format.combine(errorObject(), timestamp(), json());

/**
 * Logger
 *
 * @param {object} [pOptions={}] {file, console} Configuração básica para os logs de arquivo e console
 * @returns {Object}
 */
function logs(pOptions = {}) {
    const xLogger = createLogger({
        levels: customLevels.levels,
        exitOnError: false,
        format: format.combine(format.errors({ stack: true }), format.json()) //format.metadata()
    });
    this.options = pOptions;

    // @ts-ignore
    //Log de arquivo
    xLogger.addRotate = pOptions => {
        const { prettyPrint, ...xOptions } = pOptions;
        xLogger.add(
            new transports.DailyRotateFile({
                filename: '%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                // zippedArchive: true,
                format: fileFormat,
                handleExceptions: false,
                maxSize: '10m',
                maxFiles: '15d',
                ...this.options.rotate,
                ...xOptions
            })
        );
    };

    // @ts-ignore
    //Log de arquivo
    xLogger.addFile = pOptions => {
        const { prettyPrint, ...xOptions } = pOptions;
        xLogger.add(
            new transports.File({
                format: fileFormat,
                maxsize: 5242880,
                handleExceptions: false,
                ...this.options.file,
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
                ...this.options.console,
                ...xOptions
            })
        );
    };

    return xLogger;
}

module.exports = logs;
