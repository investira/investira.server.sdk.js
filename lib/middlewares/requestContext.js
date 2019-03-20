const asyncHooks = require('async_hooks');
const onFinished = require('on-finished');

const { isUndefined, isEmpty } = require('investira.sdk').validators;
const { friendlyByte } = require('investira.sdk').formats;
const {
    getRemoteAddress,
    getRemoteProxyAddress,
    getLocalAddress
} = require('investira.sdk').httpRequests;

const requestContextState = {
    count: { active: 0, total: 0 },
    context: {},
    dbServer: null,
    hook: null,
    hosts: {},
    DDOSOptions: {}
};
const { InternalServerError } = require('../messages/ServerErrors');
const { TooManyRequestsError } = require('../messages/ClientErrors');

const DDOSInterval = 1000; //1 segundo

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
    // getContextData() {
    //     return this.getContext().data;
    // },

    getContextData() {
        let xContext = requestContextState.context[this.getId()];
        if (isEmpty(xContext)) {
            throw new InternalServerError(
                `[${this.getId()}] requestContext precisa ser inicializado antes. Inclua o requestContextMiddleware no express.use.`
            );
            // gLog.error(
            //     new InternalServerError(
            //         `[${this.getId()}] requestContext precisa ser inicializado antes. Inclua o requestContextMiddleware no express.use.`
            //     )
            // );
            // return null;
        }
        return xContext.data;
    },

    /**
     * Retorna os dados referente a execução atual
     *
     * @returns
    //  */
    hasContext() {
        return !isEmpty(requestContextState.context[this.getId()]);
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
    },

    start() {
        requestContextHook.enable();
    },
    stop() {
        requestContextHook.disable();
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
    enable() {
        requestContextState.hook = asyncHooks
            .createHook({
                //@ts-ignore
                init: (asyncId, type, parentAsyncId, parentResource) => {
                    //Inicializa contexto somente quando for o início do request
                    if (type == 'HTTPPARSER') {
                        this.createStateContext(parentAsyncId);
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

                    this.delete(pAsyncId);
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
                    setImmediate(this.delete.bind(this, pAsyncId));
                }
            })
            .enable();
        // process._rawDebug(asyncHooks.executionAsyncId());
        // process._rawDebug(requestContext.getId());
        // xSelf.createStateContext(asyncHooks.executionAsyncId());
    },

    disable() {
        requestContextState.hook.disable();
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

/**
 * Cria middleware para administrar requestContext.
 * Middleware para controle do: r
 * - RequestContext,
 * - Conexão com o DB com commit ou rollback em caso de erro
 * - Limite de requisições por segundo para controlar ataques DDOS
 *
 * @param {*} pDBServer Banco de dados
 * @param {*} [pDDOSOptions={ limit: 0 }] Quantidade de requisições permitidas por segundo de um mesmo IP
 * @returns
 */
const requestContextMiddleware = (pDBServer, pDDOSOptions = { limit: 0 }) => {
    requestContextState.dbServer = pDBServer;
    requestContextState.DDOSOptions = pDDOSOptions;
    return async (req, res, next) => {
        //Contador de request ativos: incrementa
        requestContextState.count.active++;
        //Contador de request efetuados no total desde o início do servidor
        requestContextState.count.total++;
        //Salva número atual do request
        requestContext.set('reqId', requestContextState.count.total);

        //Resolve e salva os ips originais do request
        res.locals.remoteAddress = getRemoteAddress(req);
        res.locals.remoteProxyAddress = getRemoteProxyAddress(req);
        res.locals.localAddress = getLocalAddress(req);

        gLog.note(
            `begin\t${req.method}:${req.originalUrl}\t${
                res.locals.remoteAddress
            }`
        );

        //Monitoramento de DDOS
        pvDDOSMonitor(req, res)
            .then(async () => {
                //Abre conexão
                return await pvOpenConnection(res);
            }) //Sucesso
            .then(() => {
                //Continua
                next();
            })
            //Erro
            .catch(rErr => {
                gLog.error(rErr);
                try {
                    throw new InternalServerError();
                } catch (err) {
                    res.end();
                }
            });

        //Monitora quando o request for finalizado,
        //Fecha conexão com o banco
        //Emite evento informando o fim
        onFinished(res, async err => {
            gLog.debug(`onFinished`);
            let xCN = requestContext.get('cn');
            //Contador de request ativos: decrementa
            requestContextState.count.active--;

            if (!isEmpty(err)) {
                gLog.error(err);
            }
            //Fecha conexão com o banco
            await pvCloseConnection(xCN).then(() => {
                //Log
                gLog.info(
                    `Requests Total:${
                        requestContextState.count.total
                    } \tRequests Active:${
                        requestContextState.count.active
                    } \tActive Contexts:${requestContext.childrenCount()} \t(Current Context Id:${requestContext.getId()})`
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
                // requestContextEvents.emit('end', req, res);
                gLog.note(
                    `end  \t${req.method}:${req.originalUrl}\t${
                        res.locals.remoteAddress
                    } ${
                        requestContextState.hosts[res.locals.remoteAddress]
                            .count
                    }`
                );
            });
        });
    };
};

const pvDDOSMonitor = async (req, res) => {
    return await new Promise(async (pResolve, pReject) => {
        //Cria contador do host, se não existir
        if (!requestContextState.hosts[res.locals.remoteAddress]) {
            requestContextState.hosts[res.locals.remoteAddress] = { count: 0 };
        } else {
            //Adiciona 1 ao contador
            requestContextState.hosts[res.locals.remoteAddress].count++;
            //Substrai constador após DDOSInterval segundos
            setTimeout(() => {
                requestContextState.hosts[res.locals.remoteAddress].count--;
            }, DDOSInterval);
            //Verica se contador é superior ao limite permitido por host
            if (
                requestContextState.DDOSOptions.limit > 0 &&
                requestContextState.hosts[res.locals.remoteAddress].count >
                    requestContextState.DDOSOptions.limit
            ) {
                return pReject(
                    new TooManyRequestsError(
                        `Too Many Requests For [${res.locals.remoteAddress}][${
                            req.ip
                        }] ${
                            requestContextState.hosts[res.locals.remoteAddress]
                                .count
                        }`
                    )
                );
            }
        }
        pResolve();
    });
};
/**
 * Abre a conexão e sessão com o banco
 *
 * @returns Promise
 */
const pvOpenConnection = async res => {
    return await new Promise(async (pResolve, pReject) => {
        if (isEmpty(requestContextState.dbServer)) {
            return pResolve();
        }
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
                //Define função que será chamada pelo endpointResponse ao final da resposta ao request
                //para finalizar a transação com commit ou rollback
                res.locals.endTransaction = () => {
                    return pvEndTransaction(res, requestContext.get('cn'));
                };
                //Inicia transação
                return pvStartTransaction(requestContext.get('cn'));
            })
            //Sucesso
            .then(() => {
                pResolve();
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
const pvCloseConnection = async pCN => {
    if (isEmpty(pCN)) {
        return Promise.resolve();
    } else {
        return await requestContextState.dbServer.closeConnection(pCN);
    }
};

/**
 * Abre a conexão e sessão com o banco
 *
 * @returns Promise
 */
const pvStartTransaction = async pCN => {
    return await requestContextState.dbServer.startTransaction(pCN);
};

/**
 * Finaliza transação
 * OK quando statusCode < 400
 *
 * @param {*} pRes
 * @param {*} pCN
 * @returns
 */
const pvEndTransaction = async (pRes, pCN) => {
    return await requestContextState.dbServer.endTransaction(
        pCN,
        pRes.statusCode < 400
    );
};

module.exports = {
    requestContext,
    requestContextMiddleware
};
