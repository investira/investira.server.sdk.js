const asyncHooks = require('async_hooks');
const onFinished = require('on-finished');

// @ts-ignore
const { isUndefined, isNull } = require('investira.sdk').validators;
// const { friendlyByte } = require('investira.sdk').formats;
// @ts-ignore
const { getRemoteAddress, getRemoteProxyAddress, getLocalAddress } = require('investira.sdk').httpRequests;

// @ts-ignore
const { InternalServerError } = require('investira.sdk').messages.ServerErrors;
// @ts-ignore
const { TooManyRequestsError } = require('investira.sdk').messages.ClientErrors;

const DDOSInterval = 1000; //1 segundo

// const callsite = require('callsite');

const gDebug = false;

function requestContext(pDBServer, pDDOSOptions = { limit: 0 }) {
    let state = {
        count: { active: 0, total: 0 },
        context: {},
        dbServer: pDBServer,
        hook: null,
        hosts: {},
        DDOSOptions: pDDOSOptions
    };

    this.getCount = () => {
        return { ...state.count };
    };

    this.getDBServer = () => {
        return state.dbServer;
    };

    /**
     * Salva uma informação no contexto atual.
     *
     *
     * @param {string} pKey
     * @param {object} pValue
     */

    this.set = (pKey, pValue) => {
        const xContextData = pvGetExecutionContextData(pKey);
        if (xContextData) {
            xContextData[pKey] = pValue;
        }
    };

    /**
     * Lê uma informação do contexto atual
     *
     * @param {string} pKey
     * @returns
     */
    this.get = pKey => {
        const xContextData = pvGetExecutionContextData(pKey);
        if (xContextData) {
            return xContextData[pKey];
        }
        return null;
    };

    /*
     * Lê uma informação do contexto atual
     *
     * @param {string} pKey
     * @returns
     */
    this.getContextData = () => {
        return pvGetExecutionContextData();
    };

    /**
     * Retorna os dados referente a execução atual
     *
     * @returns
     */
    const pvGetExecutionContextData = (pKey = '') => {
        //Id da execução atual
        let xAsyncId = this.getId();
        //Contexto da execução atual
        let xContext = pvGetContextData(xAsyncId);
        if (!xContext) {
            // @ts-ignore
            gLog.error(
                new InternalServerError(
                    `[${xAsyncId}] requestContext inexistente. ${
                        pKey ? '[key:' + pKey + ']' : ''
                    } Verifique se request foi finalizado por timeout, abortado, e/ou inclua o requestContextMiddleware no express.use.`
                )
            );
            // callsite().forEach(function (site) {
            //     console.log(site.getFunctionName() || 'anonymous', site.getFileName(), site.getLineNumber());
            // });
            return;
        }
        return xContext;
    };

    /**
     * Retorna os dados referente a execução atual
     *
     * @returns
     */
    const pvGetContextData = xAsyncId => {
        //Contexto da execução atual
        let xContext = state.context[xAsyncId || 0];
        return xContext?.data || null;
    };
    /**
     * Retorna os dados referente a execução atual
     *
     * @returns
     */
    this.hasContext = () => {
        return !isNull(state.context[this.getId()]);
    };
    /**
     * Id do execução atual
     *
     * @returns
     */
    this.getId = () => {
        const x = asyncHooks.executionAsyncId();
        return x;
    };
    /**
     * Quantidade de recursos ativos
     *
     * @returns
     */
    this.childrenCount = () => {
        return Object.keys(state.context).length;
    };

    this.create = () => {
        let tracked = {};
        state.hook = asyncHooks.createHook({
            //@ts-ignore
            init: (pAsyncId, pType, pParentAsyncId, pParentResource) => {
                //Inicializa contexto somente quando for o início do request
                if (pType == 'HTTPINCOMINGMESSAGE' || pType == 'HTTPPARSER') {
                    pvCreateContext(pParentAsyncId);
                }
                //Copia contexto pai para o filho
                pvCopyContext(pParentAsyncId, pAsyncId);

                if (gDebug) {
                    const meta = {
                        asyncId: pAsyncId,
                        type: pType,
                        parentAsyncId: pParentAsyncId,
                        parentResource: pParentResource
                    };
                    tracked[pAsyncId] = meta;

                    let xContext = state.context[pParentAsyncId];
                    let xReqId = xContext && xContext.data['reqId'];
                    //@ts-ignore
                    process._rawDebug(
                        'INIT\t',
                        xReqId,
                        '\t',
                        pParentAsyncId,
                        '\t',
                        pAsyncId,
                        '\t',
                        pType,
                        '\t',
                        pParentResource.constructor.name
                    );
                    // if (meta.type == 'TCPWRAP') {
                    //     process._rawDebug('\t', meta.parentResource);
                    // }

                    // process._rawDebug(meta.parentResource);
                }
            },
            destroy: pAsyncId => {
                if (gDebug) {
                    // process._rawDebug('DEST\t' + pAsyncId);
                    let xContext = state.context[pAsyncId];
                    let xReqId = xContext && xContext.data['reqId'];
                    const meta = tracked[pAsyncId];
                    if (meta) {
                        //@ts-ignore
                        process._rawDebug(
                            'DEST\t',
                            xReqId,
                            '\t',
                            meta.parentAsyncId,
                            '\t',
                            meta.asyncId,
                            '\t',
                            meta.type,
                            '\t',
                            meta.parentResource.constructor.name
                        );
                        // if (meta.type == 'TCPWRAP') {
                        //     process._rawDebug('\t', meta.parentResource);
                        // }
                    }

                    // process._rawDebug(meta.parentResource);
                }
                pvDeleteContext(pAsyncId);
            },
            promiseResolve: pAsyncId => {
                if (gDebug) {
                    // process._rawDebug('RESO\t' + pAsyncId);
                    let xContext = state.context[pAsyncId];
                    let xReqId = xContext && xContext.data['reqId'];

                    const meta = tracked[pAsyncId];
                    if (meta) {
                        //@ts-ignore
                        process._rawDebug(
                            'RESO\t',
                            xReqId,
                            '\t',
                            meta.parentAsyncId,
                            '\t',
                            meta.asyncId,
                            '\t',
                            meta.type,
                            '\t',
                            meta.parentResource.constructor.name
                        );
                        // if (meta.type == 'TCPWRAP') {
                        //     process._rawDebug('\t', meta.parentResource);
                        // }
                    }

                    // process._rawDebug(meta.parentResource);
                }
                // requestContext.delete(pAsyncId); // cleaning up
                //Coloca o delete na fila de execução.
                //Artifício para evitar a exclusão antes que uma
                //promise filha seja inicializada depois da finalização da promise pai.
                setImmediate(pvDeleteContext.bind(this, pAsyncId));
            }
        });
        // process._rawDebug(asyncHooks.executionAsyncId());
        // process._rawDebug(requestContext.getId());
        // xSelf.createStateContext(asyncHooks.executionAsyncId());
    };

    this.enable = () => {
        state.hook.enable();
    };
    this.disable = () => {
        state.hook.disable();
    };

    /**
     * Cria dados vázios da nova execução que esta sendo inicializada
     *
     * @param {*} pParentAsyncId
     * @returns
     */
    const pvCreateContext = pParentAsyncId => {
        //Cria objeto data vinculado ao AsyncId contendo também atributo do contexto original
        state.context[pParentAsyncId] = {
            data: { originalAsyncId: pParentAsyncId }
        };
    };
    /**
     * Copia objeto dos dados de recurso pai para o filho
     * Qualquer alteração nos dados, seja no filho ou no pai,
     * tem reflexo em todos os, pois a alteração dos dados é efetuada
     * dentro do objeto 'data'
     *
     * @param {*} pParentAsyncId
     * @param {*} pAsyncId
     */
    const pvCopyContext = (pParentAsyncId, pAsyncId) => {
        let xContext = state.context[pParentAsyncId];
        if (isUndefined(xContext)) {
            return;
        }
        //Copia o objeto 'data'
        state.context[pAsyncId] = xContext;
    };

    /**
     * Exclui dados da execução que esta sendo destruida
     *
     * @param {*} pAsyncId
     */
    const pvDeleteContext = pAsyncId => {
        const xContextData = pvGetContextData(pAsyncId);
        if (xContextData) {
            delete state.context[pAsyncId];
        }
    };

    this.middleware = function () {
        return (req, res, next) => {
            //Contador de request ativos: incrementa
            state.count.active++;
            //Contador de request efetuados no total desde o início do servidor
            state.count.total++;
            //Reseta contador
            if (state.count.total === Number.MAX_SAFE_INTEGER) {
                state.count.total = 1;
            }

            //Salva número atual do request
            try {
                this.set('reqId', state.count.total);
            } catch (err) {
                // @ts-ignore
                gLog.emerg(err);
                res.end();
                return;
            }

            //Resolve e salva os ips originais do request
            res.locals.remoteAddress = getRemoteAddress(req);
            res.locals.remoteProxyAddress = getRemoteProxyAddress(req);
            res.locals.localAddress = getLocalAddress(req);

            // @ts-ignore
            gLog.child({ ip: res.locals.remoteAddress }).note(
                `begin\t${req.method}:${req.originalUrl}\t${res.locals.remoteAddress}`
            );

            //Monitoramento de DDOS
            pvDDOSMonitor(req, res)
                .then(() => {
                    //Abre conexão
                    return pvOpenConnection(res);
                })
                .then(() => {
                    //Sucesso
                    //Monitora quando o request for finalizado,
                    onFinished(res, async err => {
                        // @ts-ignore
                        // gLog.silly(`onFinished. Aborted=${res.req.aborted}`);
                        //Contador de request ativos: decrementa
                        state.count.active--;
                        if (err) {
                            // @ts-ignore
                            gLog.error(err);
                        }
                        //Recupera conexão vinculada do asyncId
                        // const xContextData = pvGetContextData(res.locals?.asyncId || {});
                        const xContextData = pvGetContextData(this.getId()) || pvGetContextData(res.locals?.asyncId);
                        // const xContextData = pvGetContextData(pvGetContextData(this.getId());
                        let xCN = null;
                        //Indica que conexão foi abortada um função de um request abortado/cancelado
                        if (xContextData && xContextData['cn']) {
                            xCN = xContextData['cn'];
                            xCN.aborted = res.req.aborted;
                            //Fecha conexão com o banco
                            await pvCloseConnection(xCN)
                                .then(() => {
                                    //Log
                                    // @ts-ignore
                                    gLog.child({ ip: res.locals.remoteAddress }).note(
                                        `end  \t${req.method}:${req.originalUrl}\t${res.locals.remoteAddress} ${
                                            state.hosts[res.locals.remoteAddress].count
                                        }\n`
                                    );
                                })
                                .catch(rErr => {
                                    // @ts-ignore
                                    gLog.child({ ip: res.locals.remoteAddress }).error(rErr);
                                });
                        }
                        return Promise.resolve();
                    });
                    //Continua
                    next();
                })
                //Erro
                .catch(rErr => {
                    // @ts-ignore
                    gLog.error(rErr);
                    try {
                        throw new InternalServerError();
                    } catch (err) {
                        res.end();
                    }
                });
        };
    };

    /**
     * Monitora quantidade de requisições/endereço remoto
     * para diminuir risco de ataque DDOS
     *
     * @param {*} req
     * @param {*} res
     * @returns
     */
    const pvDDOSMonitor = (req, res) => {
        return new Promise((pResolve, pReject) => {
            //Cria contador do host, se não existir
            if (!state.hosts[res.locals.remoteAddress]) {
                state.hosts[res.locals.remoteAddress] = { count: 0 };
            } else {
                //Adiciona 1 ao contador
                state.hosts[res.locals.remoteAddress].count++;
                //Substrai constador após DDOSInterval segundos
                setTimeout(() => {
                    state.hosts[res.locals.remoteAddress].count--;
                }, DDOSInterval);
                //Verica se contador é superior ao limite permitido por host
                if (
                    state.DDOSOptions.limit > 0 &&
                    state.hosts[res.locals.remoteAddress].count > state.DDOSOptions.limit
                ) {
                    return pReject(
                        new TooManyRequestsError(
                            `Too Many Requests For [${res.locals.remoteAddress}][${req.ip}] ${
                                state.hosts[res.locals.remoteAddress].count
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
     * @returns {Promise}
     */
    const pvOpenConnection = res => {
        if (isNull(state.dbServer) || res.req.aborted) {
            return Promise.resolve();
        } else {
            return (
                state.dbServer
                    //Pega conexão
                    .getConnection()
                    .then(rConnection => {
                        res.locals.asyncId = this.getId();
                        //Salva conexão no requestConext para ser acessado pelo outro módulos durante o request
                        this.set('cn', rConnection); //Session Connection
                        //Salva sessão
                        // if (rConnection._properties && rConnection._properties.database) {
                        //     //Versão "@mysql/xdevapi": "8.0.23",
                        //     this.set('db', rConnection.getSchema(rConnection._properties.database));
                        // } else {
                        //     //Versão "@mysql/xdevapi": "8.0.31",
                        //     this.set('db', rConnection.getSchema());
                        // }
                        //Define função que será chamada pelo endpointResponse ao final da resposta ao request
                        //para finalizar a transação com commit ou rollback
                        res.locals.endTransaction = () => {
                            return pvEndTransaction(res, rConnection);
                        };
                        //Inicia transação
                        return pvStartTransaction(rConnection).catch(rErr => {
                            // @ts-ignore
                            gLog.error(rErr);
                            return pvCloseConnection(rConnection);
                        });
                    })
            );
        }
    };

    /**
     * Finaliza transação com rollback ou commit, conforme o ocorrência de erro e
     * fecha conexão com o banco de dados
     *
     */
    const pvCloseConnection = pCN => {
        // gLog.silly('Close connection');
        if (isNull(pCN)) {
            return Promise.resolve();
        } else {
            // gLog.silly('Close connection OK');
            return state.dbServer.closeConnection(pCN);
        }
    };

    /**
     * Abre a conexão e sessão com o banco
     *
     * @returns {Promise}
     */
    const pvStartTransaction = pCN => {
        // gLog.silly('StartTransaction');
        if (!pCN || !pCN._isOpen) {
            return Promise.resolve();
        }
        // gLog.silly('StartTransaction OK');
        return state.dbServer.startTransaction(pCN);
    };

    /**
     * Finaliza transação
     * OK quando statusCode < 400
     *
     * @param {*} pRes
     * @param {*} pCN
     * @returns
     */
    const pvEndTransaction = (pRes, pCN) => {
        // gLog.silly('EndTransaction');
        if (!pCN || !pCN._isOpen) {
            return Promise.resolve();
        }
        // gLog.silly('EndTransaction OK');
        return state.dbServer.endTransaction(pCN, pRes.statusCode < 400 && !pRes.req.aborted);
    };

    this.create();
    this.enable();
}

module.exports = requestContext;
