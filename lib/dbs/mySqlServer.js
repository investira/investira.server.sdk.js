//=========================================
//mysql
//=========================================
const mysqlx = require('@mysql/xdevapi');

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
                        .then(rConnectionPoll => {
                            //Pega conexão
                            return rConnectionPoll.getSession({
                                supportBigNumbers: false,
                                bigNumberStrings: false,
                                stringifyObjects: false,
                                debug: true
                            });
                        })
                        //Sucesso
                        .then(rConnection => {
                            // @ts-ignore
                            gLog.debug('openConnection');
                            //Flag para indicar ser conexão foi abortada pelo usuário.
                            //A flag deve ser configurada conforme regra de negócio da aplicação
                            //obs:
                            rConnection.aborted = false;
                            pResolve(rConnection);
                            //     rConnection
                            //         .sql('SELECT CONNECTION_ID()')
                            //         .execute(rRow => {
                            //             // let xId = rRow;
                            //             // gLog.debug(`openConnection [${xId}]`);
                            //             gLog.debug('openConnection');
                            //             pResolve(rConnection);
                            //         })
                            //         .catch(rErr => {
                            //             gLog.error(rErr);
                            //         });
                        })
                        //Erro
                        .catch(rErr => {
                            // @ts-ignore
                            gLog.debug(rErr);
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
            return new Promise(async (pResolve, pReject) => {
                try {
                    //Cria connectionPool se não existir
                    if (!this.state.connectionPool) {
                        this.state.connectionPool = await mysqlx.getClient(
                            {
                                host: props.host || 'localhost',
                                port: props.port || 33060,
                                mysqlx_port: props.port || 33060,
                                poolSize: props.poolSize || 15,
                                user: props.user,
                                schema: props.database,
                                database: props.database,
                                password: props.password,
                                connectTimeout: props.connectTimeout || 10000, //10 segundos
                                // stream: props.stream,
                                auth: props.auth || 'PLAIN',
                                supportBigNumbers: false,
                                bigNumberStrings: false,
                                stringifyObjects: false,
                                debug: true
                                // auth: "SHA256_MEMORY" //Sem utilizar HTTPS é necessário primeiro fazer uma conexão por fora, utilizando, por ex MySqlWorkbench
                                // auth: "MYSQL41"
                            },
                            {
                                pooling: {
                                    enabled: true,
                                    maxSize: props.poolSize || 15,
                                    maxIdleTime: props.maxIdleTime || 5,
                                    queueTimeout: props.queueTimeout || 60000 //1 minuto
                                }
                            }
                        );
                        // @ts-ignore
                        gLog.info('ConnectionPool created\t' + props.host + ':' + props.port);
                    }
                    //Sucesso
                    pResolve(this.state.connectionPool);
                } catch (pErr) {
                    //Erro
                    // @ts-ignore
                    gLog.error(pErr);
                    pReject(pErr);
                }
            });
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
                        // @ts-ignore
                        gLog.debug('Connection Retry: Aguardando 5 segundos para efetuando nova tentativa.');
                        this.state.retries = 0;
                    }, 5000);
                    return pReject(new ConnectionRequired('Não foi possível efetuar conexão: muitas tentativas'));
                }
                // this.closeConnectionPool();
                this.state.retries++;
                this.state.connectionPool = null;
                // @ts-ignore
                gLog.debug('Connection Retry: Efetuando nova tentativa.');
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
        closeConnection(pCN) {
            // return new Promise((pResolve, pReject) => {
            // @ts-ignore
            gLog.debug('closeConnection');
            if (!pCN) {
                return Promise.reject(new ConnectionRequired());
            }
            return pCN.done().then(() => {
                return pCN.close();
            });
            // });
        },

        /**
         * Inicia Transação
         *
         * @param {object} pCN
         * @returns {Promise}
         */
        startTransaction(pCN) {
            if (pCN.aborted) {
                return Promise.resolve(null);
            }
            return pCN.startTransaction();
        },

        /**
         * Finaliza Transação
         *
         * @param {object} pCN
         * @returns {Promise}
         */
        endTransaction(pCN, pOk) {
            if (pCN.aborted) {
                return null;
            }
            if (pOk) {
                return pCN
                    .commit()
                    .then(() => {
                        // @ts-ignore
                        gLog.debug(`commit resolve`);
                    })
                    .catch(rErr => {
                        // @ts-ignore
                        gLog.error(`commit reject`);
                    });
            } else {
                return pCN
                    .rollback()
                    .then(() => {
                        // @ts-ignore
                        gLog.warn(`rollback resolve`);
                    })
                    .catch(rErr => {
                        // @ts-ignore
                        gLog.error(`rollback reject`);
                    });
            }
        }
    });
};

module.exports = mySqlServer;
