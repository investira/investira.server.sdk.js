// const { isEmpty } = require("../utils/validators");
const hostsCheckPoint = pSource => {
    //Lista de hosts liberados
    whiteList = [];
    //Lista de hosts bloqueados
    blackList = [];
    //Se lista já foram inicializadas
    initialized = false;

    //Define métodos padrão, que serão sobrescritos,
    //caso tenha sido definidos em pSource
    let abstract = Object.assign(
        {
            /**
             * Retorna array com a lista de host liberados
             *
             * @returns
             */
            async initialize() {
                whiteList = await this.getWhiteList();
                blackList = await this.getBlackList();
                gLog.info("Hosts whiteList\t:" + whiteList);
                gLog.info("Hosts blackList\t:" + blackList);
                initialized = true;
            },

            /**
             * Retorna array com a lista de host liberados
             *
             * @returns
             */
            getWhiteList() {
                return ["localhost"];
            },
            /**
             * Retorna array com a lista de host bloqueados
             *
             * @returns
             */
            getBlackList() {
                return [];
            }
        },
        pSource
    );

    return async (req, res, next) => {
        gLog.debug("hostsCheckPointMiddleware:\t" + initialized);
        //Inicializa lista caso já não tenha sido inicializada
        if (!initialized) {
            await abstract.initialize();
        }
        //Bloqueia acesso de host que:
        //Não estejam no whitelist
        //Estema no blacklist
        if (
            !whiteList.includes(req.hostname) ||
            blackList.includes(req.hostname)
        ) {
            let xError = "Invalid host:" + req.hostname;
            gLog.error(xError);
            return res.status(500).send({ error: xError });
        }
        next();
    };
};

//Midware do httpserver para configurar as origens diferentes
module.exports = hostsCheckPoint;
