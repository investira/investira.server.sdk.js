const MessageError = require('./MessageError');

module.exports.InternalServerError = class InternalServerError extends MessageError {
    /**
     * O servidor encontrou uma situação com a qual não sabe lidar.
     * @param {string} [pMessage='Internal Server Error']
     */
    constructor(pMessage = 'Internal Server Error') {
        super(pMessage, 500);
    }
};

module.exports.NotImplementedError = class NotImplementedError extends MessageError {
    /**
     * O método da requisição não é suportado pelo servidor e não pode ser manipulado.
     * Os únicos métodos exigidos que servidores suportem (e portanto não devem retornar este código) são GET e HEAD.
     * @param {string} [pMessage='Not Implemented']
     */
    constructor(pMessage = 'Not Implemented') {
        super(pMessage, 501);
    }
};

module.exports.BadGatewayError = class BadGatewayError extends MessageError {
    /**
     * Erro na conexão entre servidores
     * @param {string} [pMessage='Bad Gateway']
     */
    constructor(pMessage = 'Bad Gateway') {
        super(pMessage, 502);
    }
};

module.exports.ServiceUnavailableError = class ServiceUnavailableError extends MessageError {
    /**
     * O servidor não está pronto para manipular a requisição.
     * Causas comuns são um servidor em manutenção ou sobrecarregado. Note que junto a esta resposta,
     * uma página amigável explicando o problema deveria ser enviada.
     * Estas respostas devem ser usadas para condições temporárias
     *  e o cabeçalho HTTP Retry-After: deverá, se posível, conter o tempo estimado para recuperação do serviço.
     * O webmaster deve também tomar cuidado com os cabaçalhos relacionados com o cache que são enviados com esta resposta,
     * já que estas respostas de condições temporárias normalmente não deveriam ser postas em cache
     * @param {string} [pMessage='Service Unavailable']
     */
    constructor(pMessage = 'Service Unavailable') {
        super(pMessage, 503);
    }
};

module.exports.GatewayTimeoutError = class GatewayTimeoutError extends MessageError {
    /**
     * Erro de timeout na conexão entre servidores
     * @param {string} [pMessage='Gateway Timeout']
     */
    constructor(pMessage = 'Gateway Timeout') {
        super(pMessage, 504);
    }
};

module.exports.HTTPVersionNotSupportedError = class HTTPVersionNotSupportedError extends MessageError {
    /**
     * A versão HTTP usada na requisição não é suportada pelo servidor.
     * @param {string} [pMessage='HTTP Version Not Supported']
     */
    constructor(pMessage = 'HTTP Version Not Supported') {
        super(pMessage, 505);
    }
};

module.exports.NetworkAuthenticationRequiredError = class NetworkAuthenticationRequiredError extends MessageError {
    /**
     * O cliente precisa se autenticar para ganhar acesso à rede interna.
     * @param {string} [pMessage='Network Authentication Required']
     */
    constructor(pMessage = 'Network Authentication Required') {
        super(pMessage, 511);
    }
};

// module.exports.Error = class Error extends MessageError {
//     constructor(pMessage = 'NotAcceptable') {
//         super(pMessage, 406);
//     }
// };
