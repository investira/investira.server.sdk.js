const winston = require('winston');
const { isObject, isEmpty } = require('investira.sdk').validators;
const { BasicMessage } = require('investira.sdk').messages.BasicMessages;

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
winston.addColors(customLevels.colors);

/**
 * Formatação do stacktrace
 *
 * @param {*} pInfo
 * @returns
 */
const errorStackFormat = winston.format(pInfo => {
    //Por MessageError ser um error resolvido internamente,
    //as informações para exibição no log, são reduzidas.
    if (pInfo instanceof BasicMessage) {
        const { status, name, ...xInfo } = pInfo;
        return { ...xInfo, message: pInfo.message };
        //Procura mais informações do stack
    } else if (pInfo instanceof Error) {
        return Object.assign({}, pInfo, { message: pInfo.stack });
        //@ts-ignore
    } else if (pInfo.message instanceof Error) {
        return Object.assign({}, pInfo, { message: pInfo.message.stack });
        //Se mensagem for um objeto, exibe seu conteúdo
    } else if (isObject(pInfo.message)) {
        // @ts-ignore
        const xMsg = pInfo.message.data || JSON.stringify(pInfo.message, null, 2);
        return Object.assign({}, pInfo, { message: xMsg });
        // return Object.assign({}, pInfo, {
        //     message: JSON.stringify(pInfo.message, null, 2)
        // });
    }
    return pInfo;
});

/**
 * Formatação básica padrão
 *
 * @param {*} pFormats
 */
const basicFormat = (...pFormats) =>
    winston.format.combine(
        ...pFormats,
        errorStackFormat(),
        winston.format.timestamp(),
        // winston.format.timestamp({
        //     format: "YYYY-MM-DD HH:mm:ss"
        // }),
        // winston.format.align(),
        winston.format.printf(pInfo => {
            const { timestamp, level, message, code, detail, request, ...args } = pInfo;
            const xCode = isEmpty(code)
                ? ''
                : '[' + (code.status || '') + '.' + (code.source || '') + '.' + (code.ref || '') + '] ';
            const xDetail = isEmpty(detail) ? '' : ' [' + detail + ']';
            const xMessage = xCode + message + xDetail;
            const xTS = timestamp.slice(0, 19).replace('T', ' ');
            let xRID = '';
            //Le request conext id, se existir
            try {
                // @ts-ignore
                if (!isEmpty(gRC)) {
                    //@ts-ignore
                    if (gRC.hasContext()) {
                        //@ts-ignore
                        xRID = gRC.get('reqId');
                        if (!isEmpty(xRID)) {
                            xRID = '[' + xRID + ']';
                        } else {
                            xRID = '';
                        }
                    }
                }
            } catch (err) {}
            return `${xTS} [${level}]: \t ${xRID}${xMessage}  ${
                Object.keys(args).length ? JSON.stringify(args, null, 2) : ''
            }`;
        })
    );

//Formatação para arquivo
const fileFormat = basicFormat();
//Formatação para o console
const consoleFormat = basicFormat(winston.format.colorize());

const xHandleExceptions = false;
//Cria logger
const logger = winston.createLogger({
    levels: customLevels.levels,
    format: fileFormat,
    exitOnError: false,
    transports: [
        new winston.transports.File({
            filename: './logs/error.log',
            level: 'warn',
            handleExceptions: xHandleExceptions,
            maxsize: 5242880
        }),
        new winston.transports.File({
            filename: './logs/all.log',
            level: 'info',
            handleExceptions: xHandleExceptions,
            maxsize: 5242880
        })
    ]
});
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
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: consoleFormat,
            level: 'silly',
            handleExceptions: xHandleExceptions
        })
    );
    logger.add(
        new winston.transports.File({
            filename: './logs/all_console.log',
            level: 'silly',
            handleExceptions: xHandleExceptions,
            maxsize: 5242880
        })
    );
}

module.exports = logger;
