const winston = require("winston");
const { isObject } = require("./utils/validators");

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
        emerg: "white bgRed",
        error: "red",
        warn: "yellow",
        note: "green",
        info: "white",
        debug: "cyan",
        verbose: "blue",
        silly: "magenta"
    }
};

/**
 * Formatação do stacktrace
 *
 * @param {*} info
 * @returns
 */
const errorStackFormat = winston.format(info => {
    if (info.message instanceof Error) {
        return Object.assign({}, info, { message: info.message.stack });
        // return Object.assign({}, info, {
        //     stack: info.message.stack,
        //     message: info.message.message
        // });
    } else if (isObject(info.message)) {
        return Object.assign({}, info, {
            message: JSON.stringify(info.message, null, 2)
        });
    }
    return info;
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
        winston.format.align(),
        winston.format.printf(info => {
            const { timestamp, level, message, ...args } = info;

            const ts = timestamp.slice(0, 19).replace("T", " ");
            return `${ts} [${level}]: ${message} ${
                Object.keys(args).length ? JSON.stringify(args, null, 2) : ""
            }`;
        })
    );

//Formatação para arquivo
const fileFormat = basicFormat();
//Formatação para o console
const consoleFormat = basicFormat(
    winston.format.colorize(),
    winston.format.prettyPrint()
);

//Cria logger
const logger = winston.createLogger({
    levels: customLevels.levels,
    format: fileFormat,
    transports: [
        new winston.transports.File({
            filename: "./logs/error.log",
            level: "warn",
            handleException: false,
            maxSize: 5242880
        }),
        new winston.transports.File({
            filename: "./logs/all.log",
            level: "note",
            handleException: false,
            maxSize: 5242880
        })
    ]
});
winston.addColors(customLevels.colors);

//Exibe log no console quando não for produção
/*
 * Before running your app, you can do this in console,
 *
 * export NODE_ENV=production
 * Or if you are in windows you could try this:
 *
 * SET NODE_ENV=production
 * or you can run your app like this:
 *
 * NODE_ENV=production node app.js
 * You can also set it in your js file:
 *
 * process.env.NODE_ENV = 'production';
 */
if (process.env.NODE_ENV !== "production") {
    logger.add(
        new winston.transports.Console({
            format: consoleFormat,
            level: "silly",
            handleException: false
        })
    );
}

module.exports = logger;
