//=========================================
//mysql
//=========================================
//@ts-ignore
const mysqlx = require('@mysql/xdevapi');

/**
 * Controla o pool de conex
 *
 * @param {*} pSource
 * @param {*} props
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
                this.getConnectionPool()
                    .then(async rConnectionPoll => {
                        //Pega conexão
                        return await rConnectionPoll.getSession();
                    })
                    //Sucesso
                    .then(rConnection => {
                        gLog.debug('openConnection');
                        pResolve(rConnection);
                    })
                    //Erro
                    .catch(rErr => {
                        gLog.debug(rErr);
                        //testa efetuar novas conexão com o banco
                        this.retry()
                            //Reinicia getConnection
                            .then(() => {
                                return this.getConnection();
                            })
                            //Erro
                            .catch(rErr => {
                                pReject(rErr);
                            });
                    });
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
                                mysqlxWaitTimeout: props.waitTimeout || 120,
                                maxConnection: props.maxConnection || 30,
                                supportBigNumbers: true,
                                mysqlxIdleWorkerThreadTimeout:
                                    props.mysqlxIdleWorkerThreadTimeout || 30, //] (60)
                                mysqlxMinWorkerThreads:
                                    props.mysqlxMinWorkerThreads || 3, //(2)
                                mysqlx_port_open_timeout:
                                    props.mysqlx_port_open_timeout || 60,
                                interactiveTimeout:
                                    props.interactiveTimeout || 3600,
                                connectTimeout: props.connectTimeout || 150000,
                                auth: props.auth || 'PLAIN'
                                // auth: "SHA256_MEMORY" //Sem utilizar HTTPS é necessário primeiro fazer uma conexão por fora, utilizando, por ex MySqlWorkbench
                                // auth: "MYSQL41"
                            },
                            {
                                pooling: {
                                    enabled: true,
                                    maxSize: props.poolSize || 15,
                                    maxIdleTime: props.maxIdleTime || 5000,
                                    queueTimeout: props.queueTimeout || 10000
                                }
                            }
                        );
                        gLog.info(
                            'CN:\t Created\t' + props.host + ':' + props.port
                        );
                    }
                    //Sucesso
                    pResolve(this.state.connectionPool);
                } catch (pErr) {
                    //Erro
                    gLog.error('x\t' + pErr);
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
                        gLog.debug(
                            'Connection Retry: Aguardando 1 minuto para efetuando nova tentativa.'
                        );
                        this.state.retries = 0;
                    }, 60000);
                    return pReject({
                        message:
                            'Não foi possível efetuar conexão: muitas tenstativas'
                    });
                }
                this.closeConnectionPool();
                this.state.retries++;
                this.state.connectionPool = null;
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
                this.state.connectionPool.close().catch(rErr => {
                    gLog.error(rErr);
                });
            }
        },
        /**
         *
         * Fecha conexão com o banco
         * @param {object} pCn
         * @returns
         */
        closeConnection(pCn) {
            gLog.debug('closeConnection');
            if (!pCn) {
                return;
            }
            pCn.close();
        }
    });
};

module.exports = mySqlServer;
