const Message = require('./Message');

module.exports.ContinueMessage = class ContinueMessage extends Message {
    /**
     * O servidor encontrou uma situação com a qual não sabe lidar.
     * @param {string} [pMessage='Continue']
     */
    constructor(pMessage = 'Continue') {
        super(pMessage, 100);
    }
};

module.exports.SwitchingProtocolMessage = class SwitchingProtocolMessage extends Message {
    /**
     * Esse código é enviado em resposta a um cabeçalho de solicitação Upgrade pelo cliente,
     * e indica o protocolo a que o servidor está alternando.
     * @param {string} [pMessage='Switching Protocol']
     */
    constructor(pMessage = 'Switching Protocol') {
        super(pMessage, 101);
    }
};
