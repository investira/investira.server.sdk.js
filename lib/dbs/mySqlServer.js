//=========================================
//mysql
//=========================================
const mysql = require('mysql2/promise');
const fs = require('fs');
const util = require('util');

// @ts-ignore
const { ConnectionRequired } = require('investira.sdk').messages.DataErrors;
/**
 * Controla o pool de conex
 *
 * @param {object} pSource
 * @param {object} props
 * @returns
 */
const mySqlServer = (pSource, props) => {
    return Object.assign(pSource, {
        state: {
            connectionPool: null,
            retries: 0
        },
        /**
         * Pega conexão
         *
         * @returns
         */
        getConnection() {
            return new Promise((pResolve, pReject) => {
                //Cria pool de conexão
                return (
                    this.getConnectionPool()
                        .then(rConnectionPool => {
                            //Pega conexão do pool
                            return rConnectionPool.getConnection().then(rConnection => {
                                // rConnection.removeAllListeners('error');
                                // rConnection.on('error', rErr => {
                                //     // @ts-ignore
                                //     gLog.error(`Connection Error: ${util.inspect(rErr)}`);
                                //     rConnection.release();
                                // });
                                if (!rConnection.startTransaction) {
                                    //Copia função beginTransaction para startTransaction para manter
                                    //compatibilidade com mysqlxdev
                                    rConnection.startTransaction = rConnection.beginTransaction;
                                }
                                return rConnection;
                            });
                        })
                        //Sucesso
                        .then(rConnection => {
                            if (process.env.NODE_ENV && process.env.NODE_ENV === 'homolog') {
                                // @ts-ignore
                                gLog.verbose('openConnection');
                            }
                            //Flag para indicar ser conexão foi abortada pelo usuário.
                            //A flag deve ser configurada conforme regra de negócio da aplicação
                            //obs:
                            rConnection.aborted = false;
                            pResolve(rConnection);
                        })
                        //Erro
                        .catch(rErr => {
                            // @ts-ignore
                            gLog.error(rErr, { showStack: true });
                            //testa efetuar novas conexão com o banco
                            // @ts-ignore
                            return (
                                this.retry()
                                    //Reinicia getConnection
                                    .then(() => {
                                        return this.getConnection();
                                    })
                                    //Erro
                                    .catch(rErr => {
                                        pReject(rErr);
                                    })
                            );
                        })
                );
            });
        },
        /**
         * Pega pool de conexões
         *
         * @returns
         */
        getConnectionPool() {
            if (this.state.connectionPool) {
                return this.state.connectionPool;
            }
            this.state.connectionPool = new Promise((pResolve, pReject) => {
                try {
                    const xPool = mysql.createPool({
                        connectionLimit: props.poolSize || 15,
                        // maxIdle: 5,
                        idleTimeout: props.idleTimeout || 5000, //1 minuto
                        host: props.host || 'localhost',
                        port: props.port || 3306,
                        user: props.user,
                        password: props.password,
                        database: props.database,
                        connectTimeout: props.connectTimeout || 10000, //10 segundos
                        // queueLimit: 0,
                        waitForConnections: true,
                        decimalNumbers: true, //Retorna colunas DECIMALS como número
                        // enableKeepAlive: true,
                        // keepAliveInitialDelay: 60000,
                        infileStreamFactory: path => fs.createReadStream(path) //Stream para o LOCAL DATA INFILE
                    });
                    pResolve(xPool);
                } catch (pErr) {
                    return pReject(pErr);
                }
            });
            return this.state.connectionPool;
        },
        /**
         * Faz nova tentativa de pegar conexão
         *
         * @returns
         */
        retry() {
            return new Promise(async (pResolve, pReject) => {
                if (this.state.retries == 5) {
                    //Aguarda e reseta contagem para fazer novas tentativas de conexão
                    await setTimeout(() => {
                        if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') {
                            // @ts-ignore
                            gLog.verbose('Connection Retry: Aguardando 5 segundos para efetuando nova tentativa.');
                        }
                        this.state.retries = 0;
                    }, 5000);
                    return pReject(new ConnectionRequired('Não foi possível efetuar conexão: muitas tentativas'));
                }
                // this.closeConnectionPool();
                this.state.retries++;
                this.state.connectionPool = null;
                if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') {
                    // @ts-ignore
                    gLog.verbose('Connection Retry: Efetuando nova tentativa.');
                }
                pResolve();
            });
        },
        /**
         *  Fecha pool de conexões
         *
         */
        closeConnectionPool() {
            if (this.state.connectionPool) {
                return this.state.connectionPool.close().catch(rErr => {
                    // @ts-ignore
                    gLog.error(rErr);
                });
            }
        },
        /**
         *
         * Fecha conexão com o banco
         * @param {object} pCN
         * @returns {Promise}
         */
        async closeConnection(pCN) {
            if (process.env.NODE_ENV && process.env.NODE_ENV === 'homolog') {
                // @ts-ignore
                gLog.verbose('closeConnection');
            }
            if (!pCN) {
                return Promise.reject(new ConnectionRequired());
            }
            // /
            try {
                pCN.removeAllListeners('error');
                pCN.release();
                return Promise.resolve();
            } catch (pErr) {
                // @ts-ignore
                gLog.error('closeConnection');
                // @ts-ignore
                gLog.error(pErr);
                return Promise.reject(pErr);
            }
        },

        /**
         * Inicia Transação
         *
         * @param {object} pCN
         * @returns {Promise}
         */
        async startTransaction(pCN) {
            if (pCN.aborted || !pCN._isOpen) {
                if (pCN.aborted) {
                    pCN.release();
                }
                return Promise.resolve();
            }
            return pCN.startTransaction();
        },

        /**
         * Finaliza Transação
         *
         * @param {object} pCN
         * @returns {Promise}
         */
        async endTransaction(pCN, pOk) {
            if (pCN.aborted || !pCN._isOpen) {
                if (pCN.aborted) {
                    pCN.release();
                }
                return Promise.resolve();
            }
            if (pOk) {
                try {
                    pCN.commit();
                    if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') {
                        // @ts-ignore
                        gLog.verbose(`commit->`);
                    }
                    return Promise.resolve();
                } catch (rErr) {
                    // @ts-ignore
                    gLog.error(rErr);
                    return Promise.reject(rErr);
                }
            } else {
                try {
                    pCN.rollback();
                    if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') {
                        // @ts-ignore
                        gLog.verbose(`<-rollback`);
                    }
                    return Promise.resolve();
                } catch (rErr) {
                    // @ts-ignore
                    gLog.error(rErr);
                    return Promise.reject(rErr);
                }
            }
        }
    });
};

module.exports = mySqlServer;

//   /**
//    * Alias for the MySQL user password. Makes a bit more sense in a multifactor authentication setup (see
//    * "password2" and "password3")
//    */
//   password1?: string;

//   /**
//    * 2nd factor authentication password. Mandatory when the authentication policy for the MySQL user account
//    * requires an additional authentication method that needs a password.
//    * https://dev.mysql.com/doc/refman/8.0/en/multifactor-authentication.html
//    */
//   password2?: string;

//   /**
//    * 3rd factor authentication password. Mandatory when the authentication policy for the MySQL user account
//    * requires two additional authentication methods and the last one needs a password.
//    * https://dev.mysql.com/doc/refman/8.0/en/multifactor-authentication.html
//    */
//   password3?: string;

//   /**
//    * The charset for the connection. This is called 'collation' in the SQL-level of MySQL (like utf8_general_ci).
//    * If a SQL-level charset is specified (like utf8mb4) then the default collation for that charset is used.
//    * (Default: 'UTF8_GENERAL_CI')
//    */
//   charset?: string;

//   /**
//    * The source IP address to use for TCP connection
//    */
//   localAddress?: string;

//   /**
//    * The path to a unix domain socket to connect to. When used host and port are ignored
//    */
//   socketPath?: string;

//   /**
//    * The timezone used to store local dates. (Default: 'local')
//    */
//   timezone?: string | 'local';

//   /**
//    * Stringify objects instead of converting to values. (Default: 'false')
//    */
//   stringifyObjects?: boolean;

//   /**
//    * Allow connecting to MySQL instances that ask for the old (insecure) authentication method. (Default: false)
//    */
//   insecureAuth?: boolean;

//   /**
//    * By specifying a function that returns a readable stream, an arbitrary stream can be sent when sending a local fs file.
//    */
//   infileStreamFactory?: (path: string) => Readable;

//   /**
//    * Determines if column values should be converted to native JavaScript types.
//    *
//    * @default true
//    *
//    * It is not recommended (and may go away / change in the future) to disable type casting, but you can currently do so on either the connection or query level.
//    *
//    * ---
//    *
//    * You can also specify a function to do the type casting yourself:
//    * ```ts
//    * (field: Field, next: () => void) => {
//    *   return next();
//    * }
//    * ```
//    *
//    * ---
//    *
//    * **WARNING:**
//    *
//    * YOU MUST INVOKE the parser using one of these three field functions in your custom typeCast callback. They can only be called once:
//    *
//    * ```js
//    * field.string();
//    * field.buffer();
//    * field.geometry();
//    * ```

//    * Which are aliases for:
//    *
//    * ```js
//    * parser.parseLengthCodedString();
//    * parser.parseLengthCodedBuffer();
//    * parser.parseGeometryValue();
//    * ```
//    *
//    * You can find which field function you need to use by looking at `RowDataPacket.prototype._typeCast`.
//    */
//   typeCast?: TypeCast;

//   /**
//    * A custom query format function
//    */
//   queryFormat?: (query: string, values: any) => void;

//   /**
//    * When dealing with big numbers (BIGINT and DECIMAL columns) in the database, you should enable this option
//    * (Default: false)
//    */
//   supportBigNumbers?: boolean;

//   /**
//    * Enabling both supportBigNumbers and bigNumberStrings forces big numbers (BIGINT and DECIMAL columns) to be
//    * always returned as JavaScript String objects (Default: false). Enabling supportBigNumbers but leaving
//    * bigNumberStrings disabled will return big numbers as String objects only when they cannot be accurately
//    * represented with [JavaScript Number objects](https://262.ecma-international.org/5.1/#sec-8.5)
//    * (which happens when they exceed the [-2^53, +2^53] range), otherwise they will be returned as Number objects.
//    * This option is ignored if supportBigNumbers is disabled.
//    */
//   bigNumberStrings?: boolean;

//   /**
//    * Force date types (TIMESTAMP, DATETIME, DATE) to be returned as strings rather then inflated into JavaScript Date
//    * objects. Can be true/false or an array of type names to keep as strings.
//    *
//    * (Default: false)
//    */
//   dateStrings?: boolean | Array<'TIMESTAMP' | 'DATETIME' | 'DATE'>;

//   /**
//    * This will print all incoming and outgoing packets on stdout.
//    * You can also restrict debugging to packet types by passing an array of types (strings) to debug;
//    *
//    * (Default: false)
//    */
//   debug?: any;

//   /**
//    * Generates stack traces on Error to include call site of library entrance ('long stack traces'). Slight
//    * performance penalty for most calls. (Default: true)
//    */
//   trace?: boolean;

//   /**
//    * Allow multiple mysql statements per query. Be careful with this, it exposes you to SQL injection attacks. (Default: false)
//    */
//   multipleStatements?: boolean;

//   /**
//    * List of connection flags to use other than the default ones. It is also possible to blacklist default ones
//    */
//   flags?: Array<string>;

//   /**
//    * object with ssl parameters or a string containing name of ssl profile
//    */
//   ssl?: string | SslOptions;

//   /**
//    * Return each row as an array, not as an object.
//    * This is useful when you have duplicate column names.
//    * This can also be set in the `QueryOption` object to be applied per-query.
//    */
//   rowsAsArray?: boolean;

//   /**
//    * Enable keep-alive on the socket. (Default: true)
//    */
//   enableKeepAlive?: boolean;

//   /**
//    * If keep-alive is enabled users can supply an initial delay. (Default: 0)
//    */
//   keepAliveInitialDelay?: number;

//   charsetNumber?: number;

//   compress?: boolean;

//   authSwitchHandler?: (data: any, callback: () => void) => any;

//   connectAttributes?: { [param: string]: any };

//   isServer?: boolean;

//   maxPreparedStatements?: number;

//   namedPlaceholders?: boolean;

//   nestTables?: boolean | string;

//   passwordSha1?: string;

//   pool?: any;

//   stream?: any;

//   uri?: string;

//   connectionLimit?: number;

//   maxIdle?: number;

//   idleTimeout?: number;

//   Promise?: any;

//   queueLimit?: number;

//   waitForConnections?: boolean;

//   authPlugins?: {
//     [key: string]: AuthPlugin;
//   };
// }

// this.isServer = options.isServer;
// this.stream = options.stream;
// this.localAddress = options.localAddress;
// this.socketPath = options.socketPath;
// // for the purpose of multi-factor authentication, or not, the main
// // password (used for the 1st authentication factor) can also be
// // provided via the "password1" option
// this.password2 = options.password2 || undefined;
// this.password3 = options.password3 || undefined;
// this.passwordSha1 = options.passwordSha1 || undefined;
// this.insecureAuth = options.insecureAuth || false;
// this.supportBigNumbers = options.supportBigNumbers || false;
// this.bigNumberStrings = options.bigNumberStrings || false;
// this.decimalNumbers = options.decimalNumbers || false;
// this.dateStrings = options.dateStrings || false;
// this.debug = options.debug;
// this.trace = options.trace !== false;
// this.stringifyObjects = options.stringifyObjects || false;
// this.enableKeepAlive = !!options.enableKeepAlive;
// this.keepAliveInitialDelay = options.keepAliveInitialDelay || 0;
// this.timezone = 'Z';
// this.queryFormat = options.queryFormat;
// this.pool = options.pool || undefined;
// this.ssl =
// this.typeCast = options.typeCast === undefined ? true : options.typeCast;
// this.multipleStatements = options.multipleStatements || false;
// this.rowsAsArray = options.rowsAsArray || false;
// this.namedPlaceholders = options.namedPlaceholders || false;
// this.nestTables =
// this.maxPacketSize = 0;
// this.charsetNumber = options.charset
// this.compress = options.compress || false;
// this.authPlugins = options.authPlugins;
// this.authSwitchHandler = options.authSwitchHandler;
// this.clientFlags = ConnectionConfig.mergeFlags(
// this.connectAttributes = options.connectAttributes;
// this.maxPreparedStatements = options.maxPreparedStatements || 16000;

// pool: {
//     enabled: true,
//     maxSize: props.poolSize || 15,
//     maxIdleTime: props.maxIdleTime || 5,
//     queueTimeout: props.queueTimeout || 60000 //1 minuto
// }
// auth: props.auth || 'PLAIN'
// auth: "SHA256_MEMORY" //Sem utilizar HTTPS é necessário primeiro fazer uma conexão por fora, utilizando, por ex MySqlWorkbench
// auth: "MYSQL41"
// })
// .then(rPool => {
//     console.log(rPool);
