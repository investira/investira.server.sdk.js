const { MessageSuccess } = require('./Message');

class ContinueMessage extends MessageSuccess {
    /**
     * Reposta provisória indicando que tudo ocorreu bem e que
     * o cliente deve continuar com a requisição ou ignorar se já concluiu o que gostaria.
     * @param {string} [pMessage='Continue']
     */
    constructor(pMessage = 'Continue') {
        super(pMessage, 100);
    }
}

class SwitchingProtocolMessage extends MessageSuccess {
    /**
     * Esse código é enviado em resposta a um cabeçalho de solicitação Upgrade pelo cliente,
     * e indica o protocolo a que o servidor está alternando.
     * @param {string} [pMessage='Switching Protocol']
     */
    constructor(pMessage = 'Switching Protocol') {
        super(pMessage, 101);
    }
}

module.exports = {
    ContinueMessage,
    SwitchingProtocolMessage
};
