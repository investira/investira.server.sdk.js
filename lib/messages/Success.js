const { MessageSuccess } = require('./Message');

class OkMessage extends MessageSuccess {
    /**
     * Requisição foi bem sucedida
     * @param {string} [pMessage='Ok']
     */
    constructor(pMessage = 'Success') {
        super(pMessage, 200);
    }
}

class CreatedMessage extends MessageSuccess {
    /**
     * Novo recurso foi criado como resultado.
     * Esta é uma tipica resposta enviada após uma requisição PUT.
     * @param {string} [pMessage='Created']
     */
    constructor(pMessage = 'Created') {
        super(pMessage, 201);
    }
}

class AcceptedMessage extends MessageSuccess {
    /**
     * A requisição foi recebida mas nenhuma ação foi tomada sobre ela.
     * Isto é uma requisição não-comprometedora, o que significa que não há nenhuma maneira no
     * HTTP para enviar uma resposta assíncrona indicando o resultado do processamento da solicitação.
     * Isto é indicado para casos onde outro processo ou servidor lida com a requisição, ou para processamento em lote.
     * @param {string} [pMessage='Accepted']
     */
    constructor(pMessage = 'Accepted') {
        super(pMessage, 202);
    }
}

class NonAuthoritativeInformationMessage extends MessageSuccess {
    /**
     * O conjunto de meta-informações retornadas não é o conjunto exato disponível no servidor de origem,
     * mas coletado de uma cópia local ou de terceiros.
     * Exceto essa condição, a resposta de 200 OK deve ser preferida em vez dessa resposta.
     * @param {string} [pMessage='Non-Authoritative Information']
     */
    constructor(pMessage = 'Non-Authoritative Information') {
        super(pMessage, 203);
    }
}

class NoContentMessage extends MessageSuccess {
    /**
     * Não há conteúdo para enviar para esta solicitação, mas os cabeçalhos podem ser úteis.
     * O user-agent pode atualizar seus cabeçalhos em cache para este recurso com os novos.
     * @param {string} [pMessage='No Content']
     */
    constructor(pMessage = 'No Content') {
        super(pMessage, 204);
    }
}

class ResetContentMessage extends MessageSuccess {
    /**
     * Esta requisição é enviada após realizanda a solicitação para informar ao user agent
     * redefinir a visualização do documento que enviou essa solicitação.
     * @param {string} [pMessage='Reset Content']
     */
    constructor(pMessage = 'Reset Content') {
        super(pMessage, 205);
    }
}

class PartialContentMessage extends MessageSuccess {
    /**
     * Esta resposta é usada por causa do cabeçalho de intervalo enviado pelo cliente para separar o download em vários fluxos.
     * @param {string} [pMessage='Partial Content']
     */
    constructor(pMessage = 'Partial Content') {
        super(pMessage, 206);
    }
}

module.exports = {
    OkMessage,
    CreatedMessage,
    AcceptedMessage,
    NonAuthoritativeInformationMessage,
    NoContentMessage,
    ResetContentMessage,
    PartialContentMessage
};
