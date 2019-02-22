const MessageError = require('./MessageError');

module.exports.BadRequestError = class BadRequestError extends MessageError {
    /**
     * Servidor não entendeu a requisição pois está com uma sintaxe inválida.
     * @param {string} [pMessageText='Bad Request']
     */
    constructor(pMessageText = 'Bad Request') {
        super(pMessageText, 400);
    }
};

module.exports.UnauthorizedError = class UnauthorizedError extends MessageError {
    /**
     * Não autenticado
     * @param {string} [pMessageText='Unauthorized']
     */
    constructor(pMessageText = 'Unauthenticated') {
        super(pMessageText, 401);
    }
};

module.exports.PaymentRequiredError = class PaymentRequiredError extends MessageError {
    /**
     * Pagamento requerido
     * @param {string} [pMessage='Payment Required']
     */
    constructor(pMessage = 'Payment Required') {
        super(pMessage, 402);
    }
};

module.exports.ForbiddenError = class ForbiddenError extends MessageError {
    /**
     * O cliente não tem direitos de acesso ao conteúdo.
     * Diferente do código 401, aqui a identidade do cliente é conhecida.
     * @param {string} [pMessage='Forbidden']
     */
    constructor(pMessage = 'Forbidden') {
        super(pMessage, 403);
    }
};

module.exports.NotFoundError = class NotFoundError extends MessageError {
    /**
     * O servidor não encontrou o recurso solicitado
     * @param {string} [pMessage='Not found']
     */
    constructor(pMessage = 'Not found') {
        super(pMessage, 404);
    }
};

module.exports.MethodNotAllowedError = class MethodNotAllowedError extends MessageError {
    /**
     * O método de solicitação é conhecido pelo servidor, mas foi desativado e não pode ser usado.
     * @param {string} [pMessage='Method Not Allowed']
     */
    constructor(pMessage = 'Method Not Allowed') {
        super(pMessage, 405);
    }
};

module.exports.NotAcceptableError = class NotAcceptableError extends MessageError {
    /**
     * Essa resposta é enviada quando o servidor da Web após realizar a negociação de conteúdo orientada pelo servidor,
     * não encontra nenhum conteúdo seguindo os critérios fornecidos pelo agente do usuário.
     * @param {string} [pMessage='Not Acceptable']
     */
    constructor(pMessage = 'Not Acceptable') {
        super(pMessage, 406);
    }
};

module.exports.ProxyAuthenticationRequiredError = class ProxyAuthenticationRequiredError extends MessageError {
    /**
     * Semelhante ao 401 porem é necessário que a autenticação seja feita por um proxy.
     * @param {string} [pMessage='Proxy Authentication Required']
     */
    constructor(pMessage = 'Proxy Authentication Required') {
        super(pMessage, 407);
    }
};

module.exports.RequestTimeoutError = class RequestTimeoutError extends MessageError {
    /**
     * Servidor gostaria de derrubar esta conexão em desuso.
     * @param {string} [pMessage='Request Timeout']
     */
    constructor(pMessage = 'Request Timeout') {
        super(pMessage, 408);
    }
};

module.exports.ConflictError = class ConflictError extends MessageError {
    /**
     * Requisição está conflitando com o estado corrente do servidor.
     * @param {string} [pMessage='Conflict']
     */
    constructor(pMessage = 'Conflict') {
        super(pMessage, 409);
    }
};

module.exports.GoneError = class GoneError extends MessageError {
    /**
     * Esta resposta será enviada quando o conteúdo requisitado foi deletado do servidor
     * @param {string} [pMessage='Gone']
     */
    constructor(pMessage = 'Gone') {
        super(pMessage, 410);
    }
};

module.exports.LengthRequiredError = class LengthRequiredError extends MessageError {
    /**
     * Campo Content-Length do cabeçalho não foi definido.
     * @param {string} [pMessage='Length Required']
     */
    constructor(pMessage = 'Length Required') {
        super(pMessage, 411);
    }
};

module.exports.PreconditionFailedError = class PreconditionFailedError extends MessageError {
    /**
     * O cliente indicou nos seus cabeçalhos pré-condições que o servidor não atende
     * @param {string} [pMessage='Precondition Failed']
     */
    constructor(pMessage = 'Precondition Failed') {
        super(pMessage, 412);
    }
};

module.exports.PayloadTooLargeError = class PayloadTooLargeError extends MessageError {
    /**
     * A entidade requisição é maior do que os limites definidos pelo servidor;
     * o servidor pode fechar a conexão ou retornar um campo de cabeçalho Retry-After.
     * @param {string} [pMessage='Payload Too Large']
     */
    constructor(pMessage = 'Payload Too Large') {
        super(pMessage, 413);
    }
};

module.exports.URITooLongError = class URITooLongError extends MessageError {
    /**
     * A URI requisitada pelo cliente é maior do que o servidor aceita para interpretar.
     * @param {string} [pMessage='URI Too Long']
     */
    constructor(pMessage = 'URI Too Long') {
        super(pMessage, 414);
    }
};

module.exports.UnsupportedMediaTypeError = class UnsupportedMediaTypeError extends MessageError {
    /**
     * O formato de mídia dos dados requisitados não é suportado pelo servidor.
     * @param {string} [pMessage='Unsupported Media Type']
     */
    constructor(pMessage = 'Unsupported Media Type') {
        super(pMessage, 415);
    }
};

module.exports.RequestedRangeNotSatisfiableError = class RequestedRangeNotSatisfiableError extends MessageError {
    /**
     * O trecho especificado pelo campo Range do cabeçalho na requisição não pode ser preenchido;
     * é possível que o trecho esteja fora do tamanho dos dados da URI alvo.
     * @param {string} [pMessage='Requested Range Not Satisfiable']
     */
    constructor(pMessage = 'Requested Range Not Satisfiable') {
        super(pMessage, 416);
    }
};

module.exports.ExpectationFailedError = class ExpectationFailedError extends MessageError {
    /**
     * Expectativa indicada pelo campo Expect do cabeçalho da requisição não pode ser satisfeita pelo servidor.
     * @param {string} [pMessage='Expectation Failed']
     */
    constructor(pMessage = 'Expectation Failed') {
        super(pMessage, 417);
    }
};

module.exports.ImATeapotError = class ImATeapotError extends MessageError {
    /**
     * O servidor recusa a tentativa de coar café num bule de chá.
     * @param {string} [pMessage="I'm a teapot"]
     */
    constructor(pMessage = "I'm a teapot") {
        super(pMessage, 418);
    }
};

module.exports.MisdirectedRequestError = class MisdirectedRequestError extends MessageError {
    /**
     * A requisição foi direcionada a um servidor inapto a produzir a resposta.
     * Pode ser enviado por um servidor que não está configurado para produzir respostas para a combinação de esquema ("scheme") e autoridade inclusas na URI da requisição
     * @param {string} [pMessage='Misdirected Request']
     */
    constructor(pMessage = 'Misdirected Request') {
        super(pMessage, 421);
    }
};

module.exports.UnprocessableEntityError = class UnprocessableEntityError extends MessageError {
    /**
     * A requisição está bem formada, mas inabilitada para ser seguida devido a erros semânticos.
     * @param {string} [pMessage='Unprocessable Entity']
     */
    constructor(pMessage = 'Unprocessable Entity') {
        super(pMessage, 422);
    }
};

module.exports.LockedError = class LockedError extends MessageError {
    /**
     * O recurso solicitado está trancado
     * @param {string} [pMessage='Locked']
     */
    constructor(pMessage = 'Locked') {
        super(pMessage, 423);
    }
};

module.exports.FailedDependencyError = class FailedDependencyError extends MessageError {
    /**
     * A requisição falhou devido a falha em requisição prévia.
     * @param {string} [pMessage='Failed Dependency']
     */
    constructor(pMessage = 'Failed Dependency') {
        super(pMessage, 424);
    }
};

module.exports.UpgradeRequiredError = class UpgradeRequiredError extends MessageError {
    /**
     * O servidor se recusa a executar a requisição usando o protocolo enviado,
     * mas estará pronto a fazê-lo após o cliente atualizar para um protocolo diferente.
     * O servidor envia um cabeçalho Upgrade numa resposta 426 para indicar o(s) protocolo(s) requeridos.
     * @param {string} [pMessage='Upgrade Required']
     */
    constructor(pMessage = 'Upgrade Required') {
        super(pMessage, 426);
    }
};

module.exports.PreconditionRequiredError = class PreconditionRequiredError extends MessageError {
    /**
     * O servidor de origem requer que a resposta seja condicional.
     * Feito para prevenir o problema da 'atualização perdida', onde um cliente pega o estado de um recurso (GET),
     * modifica-o, e o põe de volta no servidor (PUT), enquanto um terceiro modificou o estado no servidor, levando a um conflito.
     * @param {string} [pMessage='Precondition Required']
     */
    constructor(pMessage = 'Precondition Required') {
        super(pMessage, 428);
    }
};

module.exports.TooManyRequestsError = class TooManyRequestsError extends MessageError {
    /**
     * O usuário enviou muitas requisições num dado tempo.
     * @param {string} [pMessage='Too Many Requests']
     */
    constructor(pMessage = 'Too Many Requests') {
        super(pMessage, 429);
    }
};

module.exports.RequestHeaderFieldsTooLargeError = class RequestHeaderFieldsTooLargeError extends MessageError {
    /**
     * Os campos de cabeçalho estão muito grandes.
     * @param {string} [pMessage='Request Header Fields Too Large']
     */
    constructor(pMessage = 'Request Header Fields Too Large') {
        super(pMessage, 431);
    }
};

module.exports.UnavailableForLegalReasonsError = class UnavailableForLegalReasonsError extends MessageError {
    /**
     * O usuário requisitou um recurso indisponível por questões legais.
     * @param {string} [pMessage='Unavailable For Legal Reasons']
     */
    constructor(pMessage = 'Unavailable For Legal Reasons') {
        super(pMessage, 451);
    }
};
