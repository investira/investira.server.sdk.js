module.exports = class Message {
    /**
     * Creates an instance of MessageError.
     * @param {string} pMessage Texto da Mensagem
     * @param {number} pStatus Código http do erro
     * @param {number} [pCode=0] Código para detalhar melhor o erro
     */
    constructor(pMessage, pStatus, pCode = 0) {
        this.name = this.constructor.name;
        this.text = pMessage;
        this.code = pStatus + '.' + ('0'.repeat(3) + (pCode || 0)).slice(-3);
        this.status = pStatus;
        this.statusMessage = pMessage;
    }
};
//<EvalError>, <SyntaxError>, <RangeError>, <ReferenceError>, <TypeError>, and <URIError>.
