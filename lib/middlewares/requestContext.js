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
                new InternalServerError(
                    `[${this.getId()}] requestContext precisa ser inicializado antes. Inclua o requestContextMiddleware no express.use.`
                )
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
    /**
     * O AsyncId é criado a partir tendo um parentAsyncId
     * Quando o parentAsyncId = 0, indica que o parent é uma lib em "C"
     * O parent pode ser destruido antes do filho
     *
     */
    create() {
        let xSelf = this;
        asyncHooks
            .createHook({
                //@ts-ignore
                init: (asyncId, type, parentAsyncId, parentResource) => {
                    //Inicializa contexto somente quando for o início do request
                    if (type == 'HTTPPARSER') {
                        xSelf.createStateContext(parentAsyncId);
                    }
                    //Copia contexto pai para o filho
                    requestContextHook.copy(parentAsyncId, asyncId);
                    // const meta = {
                    //     asyncId,
                    //     type,
                    //     parentAsyncId: parentAsyncId,
                    //     parentResource: parentResource
                    // };
                    // tracked[asyncId] = meta;
                    // process._rawDebug(
                    //     'INIT\t' +
                    //         parentAsyncId +
                    //         '\t' +
                    //         asyncId +
                    //         '\t' +
                    //         type +
                    //         '\t' +
                    //         parentResource.constructor.name
                    // );
                    // process._rawDebug(meta.parentResource);
                },
                destroy: pAsyncId => {
                    // process._rawDebug('DEST\t' + pAsyncId);
                    // const meta = tracked[pAsyncId];
                    // if (meta)
                    //     process._rawDebug(
                    //         'DEST\t' +
                    //             meta.parentAsyncId +
                    //             '\t' +
                    //             meta.asyncId +
                    //             '\t' +
                    //             meta.type +
                    //             '\t' +
                    //             meta.parentResource.constructor.name
                    //     );
                    // process._rawDebug(meta.parentResource);

                    xSelf.delete(pAsyncId);
                },
                promiseResolve: pAsyncId => {
                    // process._rawDebug('RESO\t' + pAsyncId);
                    // const meta = tracked[pAsyncId];
                    // if (meta)
                    //     process._rawDebug(
                    //         'RESO\t' +
                    //             meta.parentAsyncId +
                    //             '\t' +
                    //             meta.asyncId +
                    //             '\t' +
                    //             meta.type +
                    //             '\t' +
                    //             meta.parentResource.constructor.name
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
        // process._rawDebug(asyncHooks.executionAsyncId());
        // process._rawDebug(requestContext.getId());
        // xSelf.createStateContext(asyncHooks.executionAsyncId());
    },
    /**
     * Cria dados vázios da nova execução que esta sendo inicializada
     *
     * @param {*} pAsyncId
     * @returns
     */
    createStateContext(pAsyncId) {
        //Cria objeto data vinculado ao AsyncId contendo também atributo do contexto original
        requestContextState.context[pAsyncId] = {
            data: { originalAsyncId: pAsyncId }
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
    return async (req, res, next) => {
        //Contador de request ativos: incrementa
        requestContextState.count.current++;
        //Contador de request efetuados no total desde o início do servidor
        requestContextState.count.total++;

        gLog.note(
            `begin\t[${
                requestContextState.count.total
            }][${requestContext.getId()}][\t${req.url}`
        );

        requestContext.set('reqId', requestContextState.count.total);

        if (!isEmpty(requestContextState.dbServer)) {
            //Abre conexão
            await pvOpenConnection()
                .then(async rCn => {
                    return await pvStartTransaction(rCn);
                })
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
        onFinished(res, async err => {
            // gLog.debug(
            //     `onFinished\t[${requestContext.get(
            //         'reqId'
            //     )}][${requestContext.getId()}]\t${req.url}`
            // );
            gLog.debug(`onFinished\t[${requestContext.getId()}]\t${req.url}`);
            let xCN = requestContext.get('cn');
            //Contador de request ativos: decrementa
            requestContextState.count.current--;

            if (!isEmpty(err)) {
                gLog.error(err);
            }
            //Finaliza transação
            await pvEndTransaction(xCN, res.statusCode < 400)
                .catch(rErr => {
                    gLog.error(rErr);
                })
                .then(async () => {
                    //Fecha conexão com o banco de dados
                    return await pvCloseConnection(xCN);
                })
                .then(() => {
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
                        `end\t[${requestContext.get(
                            'reqId'
                        )}][${requestContext.getId()}][${
                            requestContextState.count.total
                        }]\t${req.url}`
                    );
                });
        });
    };
};
// const pvOpenConnection = async () => {
//     return Promise.resolve();
// };

/**
 * Abre a conexão e sessão com o banco
 *
 * @returns Promise
 */
const pvOpenConnection = async () => {
    return await new Promise(async (pResolve, pReject) => {
        await requestContextState.dbServer
            //Pega conexão
            .getConnection()
            .then(async rConnection => {
                //Salva conexão no requestConext para ser acessado pelo outro módulos durante o request
                requestContext.set('cn', rConnection); //Session Connection
                //Recupera schema/db/sessão
                return await rConnection.getSchema(
                    rConnection._properties.database
                );
            })
            .then(rSchema => {
                //Salva sessão
                requestContext.set('db', rSchema);
            })
            //Sucesso
            .then(() => {
                pResolve(requestContext.get('cn'));
            })
            //Erro
            .catch(rErr => {
                pReject(rErr);
            });
    });
};

// const pvCloseConnection = async pCN => {
//     return Promise.resolve();
// };
/**
 * Finaliza transação com rollback ou commit, conforme o ocorrência de erro e
 * fecha conexão com o banco de dados
 *
 */
const pvCloseConnection = async pCN => {
    return await requestContextState.dbServer.closeConnection(pCN);
};

/**
 * Abre a conexão e sessão com o banco
 *
 * @returns Promise
 */
const pvStartTransaction = async pCN => {
    return await pCN.startTransaction();
};

/**
 * Abre a conexão e sessão com o banco
 *
 * @returns Promise
 */
const pvEndTransaction = async (pCN, pOk) => {
    if (pOk) {
        gLog.debug(`commit`);
        return await pCN.commit();
    } else {
        gLog.warn(`rollback`);
        return await pCN.rollback();
    }
};

module.exports = {
    requestContext,
    requestContextMiddleware,
    requestContextEvents
};
