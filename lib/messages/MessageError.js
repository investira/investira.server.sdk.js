// const Message = require('./Message');
module.exports = class MessageError extends Error {
    /**
     * Creates an instance of MessageError.
     * @param {string} pMessage Texto da Mensagem
     * @param {number} pStatus Código http do erro
     * @param {number} [pCode=0] Código para detalhar melhor o erro
     */
    constructor(pMessage, pStatus, pCode = 0) {
        super(pMessage);
        // let x = new Message(pMessage, pStatus, pCode);
        // Object.apply(this, { ...x });
        this.name = this.constructor.name;
        this.text = pMessage;
        this.code = pStatus + '.' + ('0'.repeat(3) + (pCode || 0)).slice(-3);
        this.status = pStatus;
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        } else {
            this.stack = new Error(pMessage).stack;
        }
    }
};
