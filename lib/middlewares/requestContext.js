const asyncHooks = require("async_hooks");
const onFinished = require("on-finished");
const xEvents = require("events");
const requestContextEvents = new xEvents();
const { isUndefined, isEmpty } = require("../utils/validators");
const { friendlyByte } = require("../utils/formats");

const requestContext = {
    //controle global
    state: {
        count: { current: 0, total: 0 },
        context: {}
    },

    /**
     * Salva uma informação no contexto atual.
     *
     *
     * @param {*} pKey
     * @param {*} pValue
     */
    set(pKey, pValue) {
        this.getContextData()[pKey] = pValue;
    },

    /**
     * Lê uma informação do contexto atual
     *
     * @param {*} pKey
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
        let xContext = this.state.context[this.getId()];
        if (isUndefined(xContext)) {
            gLog.error(
                "[" +
                    this.getId() +
                    "] requestContext precisa ser inicializado antes. Inclua o requestContextMiddleware no express.use."
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
        return Object.keys(requestContext.state.context).length;
    }
};

// let tracked = {};
const requestContextHook = {
    create() {
        let xSelf = this;
        asyncHooks
            .createHook({
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
        requestContext.state.context[requestContext.getId()] = {
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
        let xContext = requestContext.state.context[pParentAsyncId];
        if (isUndefined(xContext)) {
            return;
        }
        //Copia o objeto 'data'
        requestContext.state.context[pAsyncId] = xContext;
    },

    /**
     * Exclui dados da execução que esta sendo destruida
     *
     * @param {*} pAsyncId
     */
    delete(pAsyncId) {
        if (requestContext.state.context[pAsyncId]) {
            delete requestContext.state.context[pAsyncId];
        }
    }
};
//Cria hook e inicia o monitoramento do request conext
requestContextHook.create();

/**
 * Cria middleware para administrar requestContext.
 * Caso seja informado dbServer, abre uma conexão com transação no início de request
 * e fecha ao final com rollback, no caso de erro, ou commit, no caso de sucesso.
 * Em caso de
 * @param {*} pDBServer
 * @returns
 */
let dbServer;
const requestContextMiddleware = pDBServer => {
    dbServer = pDBServer;
    return Object.assign((req, res, next) => {
        //Contador de request ativos: incrementa
        requestContext.state.count.current++;
        //Contador de request efetuados no total desde o início do servidor
        requestContext.state.count.total++;
        gLog.note("begin\t[" + requestContext.state.count.total + "]");
        requestContext.set("reqId", requestContext.state.count.total);

        if (!isEmpty(dbServer)) {
            //Abre conexão
            pvOpenConnection()
                .then(() => {
                    next();
                })
                .catch(rErr => {
                    gLog.error(rErr);
                });
        } else {
            next();
        }

        //Monitora quando o request for finalizado,
        //Fecha conexão com o banco
        //Emite evento informando o fim
        onFinished(res, err => {
            //Contador de request ativos: decrementa
            requestContext.state.count.current--;

            //Fecha conexão com o banco de dados
            pvCloseConnection(res);

            //Log
            gLog.info(
                "Request Total:" +
                    requestContext.state.count.total +
                    "\tCurrent:" +
                    requestContext.state.count.current +
                    "\tCurrentChildren:" +
                    requestContext.childrenCount() +
                    "(Current Id:" +
                    requestContext.getId() +
                    ")"
            );
            gLog.info(
                "Memory:" +
                    friendlyByte(process.memoryUsage().rss) +
                    "\tHeap Livre:" +
                    friendlyByte(
                        process.memoryUsage().heapTotal -
                            process.memoryUsage().heapUsed
                    ) +
                    "\tHeap Total:" +
                    friendlyByte(process.memoryUsage().heapTotal)
            );
            //Emite evento informando que o request foi finalizado
            requestContextEvents.emit("end", req, res);
            gLog.note("end\t[" + requestContext.get("reqId") + "]");
        });
    });
};

/**
 * Abre a conexão e sessão com o banco
 *
 * @returns Promise
 */
const pvOpenConnection = () => {
    return new Promise((pResolve, pReject) => {
        dbServer
            .getConnection()
            .then(rConnection => {
                //Salva conexão no requestConext para ser acessado pelo outro módulos durante o request
                requestContext.set("cn", rConnection); //Session Connection
                //Inicia transação
                return Promise.all([
                    rConnection.startTransaction(),
                    rConnection
                ]);
            })
            .then(async ([rOk, rConnection]) => {
                //Recupera schema/db/sessão
                return Promise.all([
                    rConnection.getSchema(rConnection._properties.database),
                    rConnection
                ]);
            })
            .then(([rSchema, rConnection]) => {
                //Salva sessão
                requestContext.set("db", rSchema);
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
    if (!isEmpty(dbServer)) {
        //Fecha conexão com o banco de dados
        let xCn = requestContext.get("cn");
        if (res.statusCode == 500) {
            gLog.error(
                "rollback\t" + res.statusMessage + "[" + res.statusCode + "]"
            );
            //Erro: evetua Rollback
            xCn.rollback();
        } else {
            //SucessoL efetua Commit
            xCn.commit();
        }
        //Fecha conexão
        dbServer.closeConnection(xCn);
    }
};

module.exports = {
    requestContext,
    requestContextMiddleware,
    requestContextEvents
};
