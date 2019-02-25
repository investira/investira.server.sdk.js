// import nock = require('nock');

// declare namespace parallelNock {
//     export function release():void;
// }

// declare function parallelNock (host: string, options?: any): any;
// export = parallelNock;

declare var gLog: {
    /**
     * Emergência: nivel 0
     *
     */
    emerg: (pMessage: any, pExtraInfo?: object) => void;
    /**
     * Erro: nivel 1
     *
     */
    error: (pMessage: any, pExtraInfo?: object) => void;
    /**
     * Atenção: nivel 2
     *
     */
    warn: (pMessage: any, pExtraInfo?: object) => void;
    /**
     * nota: nivel 3
     *
     */
    note: (pMessage: any, pExtraInfo?: object) => void;
    /**
     * Informação: nivel 4
     *
     */
    info: (pMessage: any, pExtraInfo?: object) => void;
    /**
     * debug: nivel 5
     *
     */
    debug: (pMessage: any, pExtraInfo?: object) => void;
    /**
     * verbose: nivel 6
     *
     */
    verbose: (pMessage: any, pExtraInfo?: object) => void;
    /**
     * silly: nivel 7
     *
     */
    silly: (pMessage: any, pExtraInfo?: object) => void;
};

declare var gRC: {
    /**
     * garva atributo no request context
     *
     */
    set: (pKey: string, pValue: object) => void;
    /**
     * Lê atributo do request context
     *
     */
    get: (pKey) => void;
    /**
     * Lê executionAsyncId atual
     *
     */
    getId: () => void;
};
