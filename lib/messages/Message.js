const { isFunction } = require('investira.sdk').validators;
class Message extends Error {
    /**
     * Creates an instance of MessageError.
     * @param {string} pMessage Texto da Mensagem
     * @param {number} pHttpStatus Código http do erro
     */
    constructor(pMessage, pHttpStatus, pSource = '0', pRef = '0') {
        if (pMessage) {
            super(pMessage.trim());
        } else {
            super();
        }
        this.name = this.constructor.name;
        this.status = pHttpStatus;
        this.code = {
            status: this.status,
            source: String(pSource || '0'),
            ref: String(pRef || '0')
        };
        if (isFunction(Error.captureStackTrace)) {
            Error.captureStackTrace(this, this.constructor);
        } else {
            this.stack = new Error(pMessage).stack;
        }
    }
}
class MessageSuccess extends Message {
    /**
     * Creates an instance of MessageError.
     * @param {string} pMessage Texto da Mensagem
     * @param {number} pHttpStatus Código http do erro
     */
    constructor(pMessage, pHttpStatus, pSource = '0', pRef = '0') {
        super(pMessage, pHttpStatus, pSource, pRef);
    }
}

class MessageError extends Message {
    /**
     * Creates an instance of MessageError.
     * @param {string} pMessage Texto da Mensagem
     * @param {number} pHttpStatus Código http do erro
     * @param {string} [pSource=0] Código da origem do erro
     * @param {string} [pRef=0] Código do erro
     */
    constructor(pMessage, pHttpStatus, pSource = '0', pRef = '0') {
        super(pMessage, pHttpStatus, pSource, pRef);
    }
}

module.exports = { Message, MessageError, MessageSuccess };
