module.exports = class Message {
    /**
     *
     * @param {*} pMessage
     * @param {*} pStatus
     */
    constructor(pMessage, pStatus, pCode) {
        this.name = this.constructor.name;
        this.code = pCode + '.' + ('0'.repeat(3) + (pCode || 0)).slice(-3);
        this.text = pMessage;
        this.status = pStatus;
        this.statusMessage = pMessage;
    }
};
//<EvalError>, <SyntaxError>, <RangeError>, <ReferenceError>, <TypeError>, and <URIError>.
