//=========================================
//mysql
//=========================================
const mysql = require('mysql2/promise');

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
                            if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') {
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
                        host: props.host || 'localhost',
                        port: props.port || 3306,
                        user: props.user,
                        password: props.password,
                        database: props.database,
                        connectTimeout: props.connectTimeout || 10000, //10 segundos
                        waitForConnections: true,
                        decimalNumbers: true //Retorna colunas DECIMALS como número
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
                    });
                    pResolve(xPool);
                } catch (pErr) {
                    return pReject(pErr);
                }
            });
            return this.state.connectionPool;

            // return new Promise((pResolve, pReject) => {
            //     try {
            //         //Cria connectionPool se não existir
            //         if (!this.state.connectionPool) {
            //             this.state.connectionPool = mysql.createPool(
            //                 {
            //                     connectionLimit: props.poolSize || 15,
            //                     host: props.host || 'localhost',
            //                     port: props.port || 3306,
            //                     user: props.user,
            //                     password: props.password,
            //                     database: props.database,
            //                     connectTimeout: props.connectTimeout || 10000, //10 segundos
            //                     waitForConnections: true

            //                     // this.isServer = options.isServer;
            //                     // this.stream = options.stream;
            //                     // this.localAddress = options.localAddress;
            //                     // this.socketPath = options.socketPath;
            //                     // // for the purpose of multi-factor authentication, or not, the main
            //                     // // password (used for the 1st authentication factor) can also be
            //                     // // provided via the "password1" option
            //                     // this.password2 = options.password2 || undefined;
            //                     // this.password3 = options.password3 || undefined;
            //                     // this.passwordSha1 = options.passwordSha1 || undefined;
            //                     // this.insecureAuth = options.insecureAuth || false;
            //                     // this.supportBigNumbers = options.supportBigNumbers || false;
            //                     // this.bigNumberStrings = options.bigNumberStrings || false;
            //                     // this.decimalNumbers = options.decimalNumbers || false;
            //                     // this.dateStrings = options.dateStrings || false;
            //                     // this.debug = options.debug;
            //                     // this.trace = options.trace !== false;
            //                     // this.stringifyObjects = options.stringifyObjects || false;
            //                     // this.enableKeepAlive = !!options.enableKeepAlive;
            //                     // this.keepAliveInitialDelay = options.keepAliveInitialDelay || 0;
            //                     // this.timezone = 'Z';
            //                     // this.queryFormat = options.queryFormat;
            //                     // this.pool = options.pool || undefined;
            //                     // this.ssl =
            //                     // this.typeCast = options.typeCast === undefined ? true : options.typeCast;
            //                     // this.multipleStatements = options.multipleStatements || false;
            //                     // this.rowsAsArray = options.rowsAsArray || false;
            //                     // this.namedPlaceholders = options.namedPlaceholders || false;
            //                     // this.nestTables =
            //                     // this.maxPacketSize = 0;
            //                     // this.charsetNumber = options.charset
            //                     // this.compress = options.compress || false;
            //                     // this.authPlugins = options.authPlugins;
            //                     // this.authSwitchHandler = options.authSwitchHandler;
            //                     // this.clientFlags = ConnectionConfig.mergeFlags(
            //                     // this.connectAttributes = options.connectAttributes;
            //                     // this.maxPreparedStatements = options.maxPreparedStatements || 16000;

            //                     // pool: {
            //                     //     enabled: true,
            //                     //     maxSize: props.poolSize || 15,
            //                     //     maxIdleTime: props.maxIdleTime || 5,
            //                     //     queueTimeout: props.queueTimeout || 60000 //1 minuto
            //                     // }
            //                     // auth: props.auth || 'PLAIN'
            //                     // auth: "SHA256_MEMORY" //Sem utilizar HTTPS é necessário primeiro fazer uma conexão por fora, utilizando, por ex MySqlWorkbench
            //                     // auth: "MYSQL41"
            //                 }
            //                 // {
            //                 //     pooling: {
            //                 //         enabled: true,
            //                 //         maxSize: props.poolSize || 15,
            //                 //         maxIdleTime: props.maxIdleTime || 5,
            //                 //         queueTimeout: props.queueTimeout || 60000 //1 minuto
            //                 //     }
            //                 // }
            //             );
            //             if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') {
            //                 // @ts-ignore
            //                 gLog.verbose('ConnectionPool created\t' + props.host + ':' + props.port);
            //             }
            //         }
            //         //Sucesso
            //         pResolve(this.state.connectionPool);
            //     } catch (pErr) {
            //         //Erro
            //         // @ts-ignore
            //         gLog.error(pErr, { showStack: true });
            //         pReject(pErr);
            //     }
            // });
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
            if (this.state.connectionPool != null) {
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
            if (process.env.NODE_ENV && process.env.NODE_ENV === 'development') {
                // @ts-ignore
                gLog.verbose('closeConnection');
            }
            if (!pCN) {
                return Promise.reject(new ConnectionRequired());
            }
            // /
            try {
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
