const Message = require('./Message');

module.exports.MultipleChoiceMessage = class MultipleChoiceMessage extends Message {
    /**
     * A requisição tem mais de uma resposta possível. User-agent ou o user deve escolher uma delas.
     * @param {string} [pMessage='Multiple Choice']
     */
    constructor(pMessage = 'Multiple Choice') {
        super(pMessage, 300);
    }
};

module.exports.MovedPermanentlyMessage = class MovedPermanentlyMessage extends Message {
    /**
     * URI do recurso requerido mudou. Provavelmente, a nova URI será especificada na resposta.
     * @param {string} [pMessage='Moved Permanently']
     */
    constructor(pMessage = 'Moved Permanently') {
        super(pMessage, 301);
    }
};

module.exports.FoundMessage = class FoundMessage extends Message {
    /**
     * URI do recurso requerido foi mudada temporariamente. Novas mudanças na URI poderão ser feitas no futuro.
     * Portanto, a mesma URI deve ser usada pelo cliente em requisições futuras.
     * @param {string} [pMessage='Found']
     */
    constructor(pMessage = 'Found') {
        super(pMessage, 302);
    }
};

module.exports.SeeOtherMessage = class SeeOtherMessage extends Message {
    /**
     * Resposta para instruir ao cliente buscar o recurso requisitado em outra URI com uma requisição GET.
     * @param {string} [pMessage='See Other']
     */
    constructor(pMessage = 'See Other') {
        super(pMessage, 303);
    }
};

module.exports.NotModifiedMessage = class NotModifiedMessage extends Message {
    /**
     * Essa resposta é usada para questões de cache.
     * Diz ao cliente que a resposta não foi modificada. Portanto, o cliente pode usar a mesma versão em cache da resposta.
     * @param {string} [pMessage='Not Modified']
     */
    constructor(pMessage = 'Not Modified') {
        super(pMessage, 304);
    }
};

module.exports.TemporaryRedirectMessage = class TemporaryRedirectMessage extends Message {
    /**
     * O servidor mandou essa resposta direcionando o cliente a buscar o recurso requisitado em outra URI com o mesmo método que foi utilizado na requisição original.
     * Tem a mesma semântica do código 302 Found, com a exceção de que o user-agent não deve mudar o método HTTP utilizado.
     * Se um POST foi utilizado na primeira requisição, um POST deve ser utilizado na segunda.
     * @param {string} [pMessage='Temporary Redirect']
     */
    constructor(pMessage = 'Temporary Redirect') {
        super(pMessage, 307);
    }
};

module.exports.PermanentRedirectMessage = class PermanentRedirectMessage extends Message {
    /**
     * Esse código significa que o recurso agora está permanentemente localizado em outra URI, especificada pelo cabeçalho de resposta Location.
     * Tem a mesma semântica do código de resposta HTTP 301 Moved Permanently, com a exceção de que o user-agent não deve mudar o método HTTP utilizado.
     * Se um POST foi utilizado na primeira requisição, um POST deve ser utilizado na segunda.
     * @param {string} [pMessage='Permanent Redirect']
     */
    constructor(pMessage = 'Permanent Redirect') {
        super(pMessage, 308);
    }
};
