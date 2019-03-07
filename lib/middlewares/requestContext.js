const asyncHooks = require('async_hooks');
const onFinished = require('on-finished');
const xEvents = require('events');
const requestContextEvents = new xEvents();

const { isUndefined, isEmpty } = require('investira.sdk').validators;
const { friendlyByte } = require('investira.sdk').formats;

const requestContextState = {
    count: { current: 0, total: 0 },
    context: {},
    dbServer: null
};
const { InternalServerError } = require('../messages/ServerErrors');

const requestContext = Object.freeze({
    /**
     * Salva uma informação no contexto atual.
     *
     *
     * @param {string} pKey
     * @param {object} pValue
     */

    set(pKey, pValue) {
        this.getContextData()[pKey] = pValue;
    },

    /**
     * Lê uma informação do contexto atual
     *
     * @param {string} pKey
     * @returns
     */
    get(pKey) {
        return this.getContextData()[pKey];
    },

    /**
     * Retorna os dados referente a execução atual
     *
     * @returns
     */
    getContextData() {
        return this.getContext().data;
    },
    /**
     * Retorna os dados referente a execução atual
     *
     * @returns
     */
    getContext() {
        let xContext = requestContextState.context[this.getId()];
        if (isUndefined(xContext)) {
            gLog.error(
                `[${this.getId()}] requestContext precisa ser inicializado antes. Inclua o requestContextMiddleware no express.use.`
            );
            return null;
        }
        return xContext;
    },

    /**
     * Id do execução atual
     *
     * @returns
     */
    getId() {
        return asyncHooks.executionAsyncId();
    },

    /**
     * Quantidade de recursos ativos
     *
     * @returns
     */
    childrenCount() {
        return Object.keys(requestContextState.context).length;
    }
});

// let tracked = {};
const requestContextHook = Object.freeze({
    create() {
        let xSelf = this;
        asyncHooks
            .createHook({
                //@ts-ignore
                init: (asyncId, type, parentAsyncId, parentResource) => {
                    requestContextHook.copy(parentAsyncId, asyncId);
                    // const meta = {
                    //     asyncId,
                    //     type,
                    //     parentAsyncId: parentAsyncId,
                    //     parentResource: parentResource
                    // };
                    // tracked[asyncId] = meta;
                    // process._rawDebug(
                    //     "INIT\t" +
                    //         parentAsyncId +
                    //         "\t" +
                    //         asyncId +
                    //         "\t" +
                    //         type +
                    //         "\t" +
                    //         parentResource.constructor.name
                    // );
                    // process._rawDebug(meta.parentResource);
                },
                destroy: pAsyncId => {
                    // process._rawDebug("DEST\t" + pAsyncId);
                    // const meta = tracked[asyncId];
                    // if (meta)
                    //     process._rawDebug(
                    //         "DEST\t" +
                    //             meta.parentAsyncId +
                    //             "\t" +
                    //             meta.asyncId +
                    //             "\t" +
                    //             meta.type +
                    //             "\t" +
                    //             meta.parentResource.constructor.name
                    //     );
                    // process._rawDebug(meta.parentResource);

                    xSelf.delete(pAsyncId);
                },
                promiseResolve: pAsyncId => {
                    // process._rawDebug("RESO\t" + pAsyncId);
                    // const meta = tracked[asyncId];
                    // if (meta)
                    //     process._rawDebug(
                    //         "RESO\t" +
                    //             meta.parentAsyncId +
                    //             "\t" +
                    //             meta.asyncId +
                    //             "\t" +
                    //             meta.type
                    //         // "\t" +
                    //         // meta.parentResource.constructor.name
                    //     );
                    // process._rawDebug(meta.parentResource);
                    // requestContext.delete(pAsyncId); // cleaning up

                    //Coloca o delete na fila de execução.
                    //Artifício para evitar a exclusão antes que uma
                    //promise filha seja inicializada depois da finalização da promise pai.
                    setImmediate(xSelf.delete.bind(xSelf, pAsyncId));
                }
            })
            .enable();
        xSelf.createStateContext();
    },
    /**
     * Cria dados vázios da nova execução que esta sendo inicializada
     *
     * @param {*} pAsyncId
     * @returns
     */
    createStateContext() {
        //Cria objeto data vinculado ao AsyncId
        requestContextState.context[requestContext.getId()] = {
            data: { originalAsyncId: requestContext.getId() }
        };
    },
    /**
     * Copia objeto dos dados de recurso pai para o filho
     * Qualquer alteração nos dados, seja no filho ou no pai,
     * tem reflexo em todos os, pois a alteração dos dados é efetuada
     * dentro do objeto 'data'
     *
     * @param {*} pSourceId
     * @param {*} TargetId
     */
    copy(pParentAsyncId, pAsyncId) {
        let xContext = requestContextState.context[pParentAsyncId];
        if (isUndefined(xContext)) {
            return;
        }
        //Copia o objeto 'data'
        requestContextState.context[pAsyncId] = xContext;
    },

    /**
     * Exclui dados da execução que esta sendo destruida
     *
     * @param {*} pAsyncId
     */
    delete(pAsyncId) {
        if (requestContextState.context[pAsyncId]) {
            delete requestContextState.context[pAsyncId];
        }
    }
});
//Cria hook e inicia o monitoramento do request conext
requestContextHook.create();

/**
 * Cria middleware para administrar requestContext.
 * Caso seja informado dbServer, abre uma conexão com transação no início de request
 * e fecha ao final com rollback, no caso de erro, ou commit, no caso de sucesso.
 */
const requestContextMiddleware = pDBServer => {
    requestContextState.dbServer = pDBServer;
    return (req, res, next) => {
        //Contador de request ativos: incrementa
        requestContextState.count.current++;
        //Contador de request efetuados no total desde o início do servidor
        requestContextState.count.total++;
        gLog.note(`begin\t[${requestContextState.count.total}]\t${req.url}`);
        requestContext.set('reqId', requestContextState.count.total);

        if (!isEmpty(requestContextState.dbServer)) {
            //Abre conexão
            pvOpenConnection()
                //Sucesso
                .then(() => {
                    //Continua
                    return next();
                })
                //Erro
                .catch(rErr => {
                    gLog.error(rErr);
                });
        } else {
            //Continua
            return next();
        }

        //Monitora quando o request for finalizado,
        //Fecha conexão com o banco
        //Emite evento informando o fim
        onFinished(res, err => {
            //Contador de request ativos: decrementa
            requestContextState.count.current--;
            gLog.note(
                `onFinished\t[${requestContext.get('reqId')}]\t${req.url}`
            );
            //Fecha conexão com o banco de dados
            pvCloseConnection(res)
                .catch(rErr => {
                    gLog.error(rErr);
                })
                .then(() => {
                    if (!isEmpty(err)) {
                        gLog.error(err);
                    }
                    //Log
                    gLog.info(
                        `Request Total:${
                            requestContextState.count.total
                        } \tCurrent:${
                            requestContextState.count.current
                        } \tCurrentChildren:${requestContext.childrenCount()} \t(Current Id:${requestContext.getId()})`
                    );
                    gLog.info(
                        `Memory: ${friendlyByte(
                            process.memoryUsage().rss,
                            1
                        )} \tHeap Total: ${friendlyByte(
                            process.memoryUsage().heapTotal,
                            1
                        )} \tHeap Livre:${friendlyByte(
                            process.memoryUsage().heapTotal -
                                process.memoryUsage().heapUsed,
                            1
                        )}`
                    );
                    //Emite evento informando que o request foi finalizado
                    requestContextEvents.emit('end', req, res);
                    gLog.note(
                        `end\t[${requestContext.get('reqId')}]\t${req.url}`
                    );
                });
        });
    };
};

/**
 * Abre a conexão e sessão com o banco
 *
 * @returns Promise
 */
const pvOpenConnection = () => {
    return new Promise((pResolve, pReject) => {
        requestContextState.dbServer
            //Pega conexão
            .getConnection()
            .then(rConnection => {
                //Salva conexão no requestConext para ser acessado pelo outro módulos durante o request
                requestContext.set('cn', rConnection); //Session Connection
                //Inicia transação
                return Promise.all([
                    rConnection.startTransaction(),
                    rConnection
                ]);
            })
            //@ts-ignore
            .then(async ([rOk, rConnection]) => {
                //Recupera schema/db/sessão
                return rConnection.getSchema(rConnection._properties.database);
            })
            .then(rSchema => {
                //Salva sessão
                requestContext.set('db', rSchema);
            })
            //Sucesso
            .then(() => {
                try {
                    pResolve();
                } catch (pErr) {
                    gLog.error(pErr);
                }
            })
            //Erro
            .catch(rErr => {
                pReject(rErr);
            });
    });
};

/**
 * Finaliza transação com rollback ou commit, conforme o ocorrência de erro e
 * fecha conexão com o banco de dados
 *
 */
const pvCloseConnection = res => {
    gLog.note(`pvCloseConnection\t[${requestContext.get('reqId')}]`);
    return new Promise(async (pResolve, pReject) => {
        gLog.note(`pvCloseConnection Promise Begin`);
        if (!isEmpty(requestContextState.dbServer)) {
            //Fecha conexão com o banco de dados
            gLog.note(`pvCloseConnection Promise End 0`);
            let xCn = requestContext.get('cn');
            //Efetua roolback caso ocorra qualquer erro com código iqual ou superior a 400
            if (res.statusCode >= 400) {
                gLog.warn(`rollback\t${res.statusMessage} [${res.statusCode}]`);
                //Erro: evetua Rollback
                await xCn
                    .rollback()
                    .then(rResult => {
                        if (rResult) {
                            return requestContextState.dbServer.closeConnection(
                                xCn
                            );
                        } else {
                            return pReject(
                                new InternalServerError('Rollback Error')
                            );
                        }
                    })
                    .then(() => {
                        pResolve(true);
                    })
                    .catch(rErr => {
                        pReject(rErr);
                    });
            } else {
                //SucessoL efetua Commit
                gLog.note(`commit\t[${requestContext.get('reqId')}]`);
                try {
                    await xCn
                        .commit()
                        .then(rResult => {
                            gLog.note(
                                `commit 0\t[${requestContext.get('reqId')}]`
                            );
                            if (rResult) {
                                gLog.note(
                                    `commit 1 \t[${requestContext.get(
                                        'reqId'
                                    )}]`
                                );
                                return requestContextState.dbServer.closeConnection(
                                    xCn
                                );
                            } else {
                                gLog.note(
                                    `commit 2\t[${requestContext.get('reqId')}]`
                                );
                                return pReject(
                                    new InternalServerError('Commit Error')
                                );
                            }
                        })
                        .then(() => {
                            gLog.note(
                                `commit 3 \t[${requestContext.get('reqId')}]`
                            );
                            return pResolve(true);
                        })
                        .catch(rErr => {
                            gLog.note(
                                `commit 4\t[${requestContext.get('reqId')}]`
                            );
                            pReject(rErr);
                        });
                } catch (err) {
                    gLog.error(err);
                }
            }
            //Fecha conexão
            // requestContextState.dbServer.closeConnection(xCn);
            gLog.note(`pvCloseConnection Promise End 1`);
        } else {
            gLog.note(`pvCloseConnection Promise End 2`);
            pResolve(true);
        }
    });
};

module.exports = {
    requestContext,
    requestContextMiddleware,
    requestContextEvents
};
