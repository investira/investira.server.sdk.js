module.exports = class Message {
    /**
     *
     * @param {*} pMessage
     * @param {*} pStatus
     */
    constructor(pMessage, pStatus, pCode) {
        this.name = this.constructor.name;
        this.code = pCode;
        this.text = pMessage;
        this.status = pStatus;
        this.statusMessage = pMessage;
    }
};
//<EvalError>, <SyntaxError>, <RangeError>, <ReferenceError>, <TypeError>, and <URIError>.
