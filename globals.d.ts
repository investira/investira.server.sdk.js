export {};

declare global {
    var gLog: {
        /**
         * Emergencia: nivel 0
         */
        emerg: (pMessage: any, pExtraInfo?: object) => void;
        /**
         * Erro: nivel 1
         */
        error: (pMessage: any, pExtraInfo?: object) => void;
        /**
         * Atencao: nivel 2
         */
        warn: (pMessage: any, pExtraInfo?: object) => void;
        /**
         * Nota: nivel 3
         */
        note: (pMessage: any, pExtraInfo?: object) => void;
        /**
         * Informacao: nivel 4
         */
        info: (pMessage: any, pExtraInfo?: object) => void;
        /**
         * Debug: nivel 5
         */
        debug: (pMessage: any, pExtraInfo?: object) => void;
        /**
         * Verbose: nivel 6
         */
        verbose: (pMessage: any, pExtraInfo?: object) => void;
        /**
         * Silly: nivel 7
         */
        silly: (pMessage: any, pExtraInfo?: object) => void;
    };

    var gRC: {
        /**
         * Grava atributo no request context
         */
        set: (pKey: string, pValue: object) => void;
        /**
         * Le atributo do request context
         */
        get: (pKey: string) => void;
        /**
         * Le executionAsyncId atual
         */
        getId: () => void;
    };
}
