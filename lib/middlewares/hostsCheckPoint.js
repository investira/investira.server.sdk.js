const endpointResponse = require('./endpointResponse');
// @ts-ignore
const { UnauthorizedError } = require('investira.sdk').messages.ClientErrors;
const { getRemoteProxyAddress } = require('investira.sdk').httpRequests;

const wWHITELIST = ['localhost', '127.0.0.1', '::1', '::ffff:127.0.0.1'];

const hostsCheckPoint = pSource => {
    //Lista de hosts liberados
    let whiteList = wWHITELIST;
    //Lista de hosts bloqueados
    let blackList = [];
    //Se lista já foram inicializadas
    let initialized = false;

    /**
     * Inicializa listas;
     *
     */
    const initialize = async () => {
        whiteList = await abstract.getWhiteList();
        blackList = await abstract.getBlackList();
        //@ts-ignore
        gLog.verbose('\twhiteList: ' + whiteList);
        //@ts-ignore
        gLog.verbose('\tblackList: ' + blackList);
        initialized = true;
    };

    //Define métodos padrão, que serão sobrescritos,
    //caso tenha sido definidos em pSource
    const abstract = Object.assign(
        {
            /**
             * Retorna array com a lista de host liberados
             *
             * @returns
             */
            getWhiteList: () => {
                return whiteList;
            },

            /**
             * Retorna array com a lista de host bloqueados
             *
             * @returns
             */
            getBlackList: () => {
                return blackList;
            }
        },
        pSource
    );

    return endpointResponse(async (pReq, _pResolve, pReject, pNext) => {
        //Inicializa lista caso já não tenha sido inicializada
        if (!initialized) {
            //@ts-ignore
            gLog.verbose('hostsCheckPointMiddleware initialize');
            await initialize();
        }
        const xRemoteAddress = getRemoteProxyAddress(pReq);
        //Bloqueia acesso de host que:
        //Não estejam no whitelist ou esteja no blacklist
        if (!whiteList.includes(xRemoteAddress) || blackList.includes(xRemoteAddress)) {
            //@ts-ignore
            //Envia resposta de erro
            gLog.error(new UnauthorizedError(`Host Unauthorized [${xRemoteAddress}]`));
            return pReject(new UnauthorizedError());
        }
        pNext();
    });

    // return Object.freeze(async (req, res, next) => {
    //     gLog.verbose('hostsCheckPointMiddleware:\t' + initialized);
    //     //Inicializa lista caso já não tenha sido inicializada
    //     if (!initialized) {
    //         await initialize();
    //     }
    //     //Bloqueia acesso de host que:
    //     //Não estejam no whitelist ou esteja no blacklist
    //     if (!whiteList.includes(req.ip) || blackList.includes(req.ip)) {
    //         //Envia resposta de erro
    //         const xError = new UnauthorizedError(`Host Unauthorized ${req.ip}`);
    //         gLog.error(xError);
    //         return sendResponse(res, {
    //             message: xError,
    //             metadata: { host: req.protocol + '://' + req.client.remoteAddress }
    //         });
    //     }
    //     next();
    // });
};

//Midware do httpserver para configurar as origens diferentes
module.exports = hostsCheckPoint;
