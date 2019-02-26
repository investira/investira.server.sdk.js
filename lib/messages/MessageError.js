// const Message = require('./Message');
const { isFunction } = require('investira.sdk').validators;
module.exports = class MessageError extends Error {
    /**
     * Creates an instance of MessageError.
     * @param {string} pMessage Texto da Mensagem
     * @param {number} pHttpStatus Código http do erro
     * @param {number} [pSource=0] Código da origem do erro
     * @param {number} [pNumber=0] Código do erro
     */
    constructor(pMessage, pHttpStatus, pSource = 0, pNumber = 0) {
        super(pMessage.trim());
        this.name = this.constructor.name;
        this.status = pHttpStatus;
        this.code = { status: this.status, source: pSource, number: pNumber };
        if (isFunction(Error.captureStackTrace)) {
            Error.captureStackTrace(this, this.constructor);
        } else {
            this.stack = new Error(pMessage).stack;
        }
    }
};
