const { MessageSuccess } = require('./Message');

class MultipleChoiceMessage extends MessageSuccess {
    /**
     * A requisição tem mais de uma resposta possível. User-agent ou o user deve escolher uma delas.
     * @param {string} [pMessage='Multiple Choice']
     */
    constructor(pMessage = 'Multiple Choice') {
        super(pMessage, 300);
    }
}

class MovedPermanentlyMessage extends MessageSuccess {
    /**
     * URI do recurso requerido mudou. Provavelmente, a nova URI será especificada na resposta.
     * @param {string} [pMessage='Moved Permanently']
     */
    constructor(pMessage = 'Moved Permanently') {
        super(pMessage, 301);
    }
}

class FoundMessage extends MessageSuccess {
    /**
     * URI do recurso requerido foi mudada temporariamente. Novas mudanças na URI poderão ser feitas no futuro.
     * Portanto, a mesma URI deve ser usada pelo cliente em requisições futuras.
     * @param {string} [pMessage='Found']
     */
    constructor(pMessage = 'Found') {
        super(pMessage, 302);
    }
}

class SeeOtherMessage extends MessageSuccess {
    /**
     * Resposta para instruir ao cliente buscar o recurso requisitado em outra URI com uma requisição GET.
     * @param {string} [pMessage='See Other']
     */
    constructor(pMessage = 'See Other') {
        super(pMessage, 303);
    }
}

class NotModifiedMessage extends MessageSuccess {
    /**
     * Essa resposta é usada para questões de cache.
     * Diz ao cliente que a resposta não foi modificada. Portanto, o cliente pode usar a mesma versão em cache da resposta.
     * @param {string} [pMessage='Not Modified']
     */
    constructor(pMessage = 'Not Modified') {
        super(pMessage, 304);
    }
}

class TemporaryRedirectMessage extends MessageSuccess {
    /**
     * O servidor mandou essa resposta direcionando o cliente a buscar o recurso requisitado em outra URI com o mesmo método que foi utilizado na requisição original.
     * Tem a mesma semântica do código 302 Found, com a exceção de que o user-agent não deve mudar o método HTTP utilizado.
     * Se um POST foi utilizado na primeira requisição, um POST deve ser utilizado na segunda.
     * @param {string} [pMessage='Temporary Redirect']
     */
    constructor(pMessage = 'Temporary Redirect') {
        super(pMessage, 307);
    }
}

class PermanentRedirectMessage extends MessageSuccess {
    /**
     * Esse código significa que o recurso agora está permanentemente localizado em outra URI, especificada pelo cabeçalho de resposta Location.
     * Tem a mesma semântica do código de resposta HTTP 301 Moved Permanently, com a exceção de que o user-agent não deve mudar o método HTTP utilizado.
     * Se um POST foi utilizado na primeira requisição, um POST deve ser utilizado na segunda.
     * @param {string} [pMessage='Permanent Redirect']
     */
    constructor(pMessage = 'Permanent Redirect') {
        super(pMessage, 308);
    }
}

module.exports = {
    MultipleChoiceMessage,
    MovedPermanentlyMessage,
    FoundMessage,
    SeeOtherMessage,
    NotModifiedMessage,
    TemporaryRedirectMessage,
    PermanentRedirectMessage
};
