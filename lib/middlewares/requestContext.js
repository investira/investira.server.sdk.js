const asyncHooks = require('async_hooks');
const onFinished = require('on-finished');

const { isUndefined, isNull } = require('investira.sdk').validators;
// const { friendlyByte } = require('investira.sdk').formats;
const { getRemoteAddress, getRemoteProxyAddress, getLocalAddress } = require('investira.sdk').httpRequests;

const { InternalServerError } = require('investira.sdk').messages.ServerErrors;
const { TooManyRequestsError } = require('investira.sdk').messages.ClientErrors;

const DDOSInterval = 1000; //1 segundo

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
        pvGetContextData()[pKey] = pValue;
    };

    /**
     * Lê uma informação do contexto atual
     *
     * @param {string} pKey
     * @returns
     */
    this.get = pKey => {
        return pvGetContextData()[pKey];
    };

    /*
     * Lê uma informação do contexto atual
     *
     * @param {string} pKey
     * @returns
     */
    this.getContextData = () => {
        return pvGetContextData();
    };

    /**
     * Retorna os dados referente a execução atual
     *
     * @returns
     */
    const pvGetContextData = () => {
        let xAsyncId = this.getId();
        let xContext = state.context[xAsyncId];
        if (isNull(xContext)) {
            throw new InternalServerError(
                `[${xAsyncId}] requestContext precisa ser inicializado antes. Inclua o requestContextMiddleware no express.use.`
            );
        }
        return xContext.data;
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
        return asyncHooks.executionAsyncId();
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
                    //@ts-ignore
                    process._rawDebug(
                        'INIT\t',
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

                    const meta = tracked[pAsyncId];
                    if (meta) {
                        //@ts-ignore
                        process._rawDebug(
                            'DEST\t',
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

                    const meta = tracked[pAsyncId];
                    if (meta) {
                        //@ts-ignore
                        process._rawDebug(
                            'RESO\t',
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
        if (state.context[pAsyncId]) {
            delete state.context[pAsyncId];
        }
    };

    this.middleware = function () {
        return (req, res, next) => {
            //Contador de request ativos: incrementa
            state.count.active++;
            //Contador de request efetuados no total desde o início do servidor
            state.count.total++;

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
                    onFinished(res, err => {
                        // @ts-ignore
                        //gLog.verbose(`onFinished. Aborted=${res.req.aborted}`);
                        //Contador de request ativos: decrementa
                        state.count.active--;
                        if (!isNull(err)) {
                            // @ts-ignore
                            gLog.error(err);
                        }
                        let xCN = this.get('cn');
                        //Indica que conexão foi abortada um função de um request abortado/cancelado
                        if (xCN) {
                            xCN.aborted = res.req.aborted;
                        }
                        //Fecha conexão com o banco
                        pvCloseConnection(xCN).then(() => {
                            //Log
                            // @ts-ignore
                            gLog.child({ ip: res.locals.remoteAddress }).note(
                                `end  \t${req.method}:${req.originalUrl}\t${res.locals.remoteAddress} ${
                                    state.hosts[res.locals.remoteAddress].count
                                }`
                            );
                        });
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
        if (isNull(state.dbServer)) {
            return Promise.resolve();
        } else {
            return (
                state.dbServer
                    //Pega conexão
                    .getConnection()
                    .then(rConnection => {
                        //Salva conexão no requestConext para ser acessado pelo outro módulos durante o request
                        this.set('cn', rConnection); //Session Connection
                        //Recupera schema/db/sessão
                        return rConnection.getSchema(rConnection._properties.database);
                    })
                    .then(rSchema => {
                        //Salva sessão
                        this.set('db', rSchema);
                        //Define função que será chamada pelo endpointResponse ao final da resposta ao request
                        //para finalizar a transação com commit ou rollback
                        res.locals.endTransaction = () => {
                            return pvEndTransaction(res, this.get('cn'));
                        };
                        //Inicia transação
                        return pvStartTransaction(this.get('cn'));
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
        if (isNull(pCN)) {
            return Promise.resolve();
        } else {
            return state.dbServer.closeConnection(pCN);
        }
    };

    /**
     * Abre a conexão e sessão com o banco
     *
     * @returns {Promise}
     */
    const pvStartTransaction = async pCN => {
        return await state.dbServer.startTransaction(pCN);
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
        return await state.dbServer.endTransaction(pCN, pRes.statusCode < 400);
    };

    this.create();
    this.enable();
}

module.exports = requestContext;
