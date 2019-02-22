// const Message = require('./Message');
module.exports = class MessageError extends Error {
    /**
     *Creates an instance of CustomError.
     * @param {*} pMessage
     * @param {*} pStatus
     * @param {*} pCode
     */
    constructor(pMessage, pStatus, pCode) {
        super(pMessage);
        // let x = new Message(pMessage, pStatus, pCode);
        // Object.apply(this, { ...x });
        this.name = this.constructor.name;
        this.text = pMessage;
        this.code = pCode;
        this.status = pStatus;
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        } else {
            this.stack = new Error(pMessage).stack;
        }
    }
};
