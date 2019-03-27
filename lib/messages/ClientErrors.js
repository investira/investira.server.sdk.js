const { MessageError } = require('./Message');

class BadRequestError extends MessageError {
    /**
     *
     * Servidor não entendeu a requisição pois dados não não válidos.
     * @param {string} [pMessageText='Bad Request']
     * @param {string} [pSource=0] Código da origem do erro
     * @param {string} [pCode=0] Código do erro
     */
    constructor(pMessageText = 'Bad Request', pSource = '0', pCode = '0') {
        super(pMessageText, 400, pSource, pCode);
    }
}

class UnauthorizedError extends MessageError {
    /**
     * Não autenticado
     * @param {string} [pMessageText='Unauthorized']
     * @param {string} [pSource=0] Código da origem do erro
     * @param {string} [pCode=0] Código do erro
     */
    constructor(pMessageText = 'Unauthenticated', pSource = '0', pCode = '0') {
        super(pMessageText, 401, pSource, pCode);
    }
}

class PaymentRequiredError extends MessageError {
    /**
     * Pagamento requerido
     * @param {string} [pMessage='Payment Required']
     */
    constructor(pMessage = 'Payment Required') {
        super(pMessage, 402);
    }
}

class ForbiddenError extends MessageError {
    /**
     * O cliente não tem direitos de acesso ao conteúdo.
     * Diferente do código 401, aqui a identidade do cliente é conhecida.
     * @param {string} [pMessage='Forbidden']
     */
    constructor(pMessage = 'Forbidden') {
        super(pMessage, 403);
    }
}

class NotFoundError extends MessageError {
    /**
     * O servidor não encontrou o recurso solicitado
     * @param {string} [pMessage='Not found']
     */
    constructor(pMessage = 'Not found') {
        super(pMessage, 404);
    }
}

class MethodNotAllowedError extends MessageError {
    /**
     * O método de solicitação é conhecido pelo servidor, mas foi desativado e não pode ser usado.
     * @param {string} [pMessage='Method Not Allowed']
     */
    constructor(pMessage = 'Method Not Allowed') {
        super(pMessage, 405);
    }
}

class NotAcceptableError extends MessageError {
    /**
     * Essa resposta é enviada quando o servidor da Web após realizar a negociação de conteúdo orientada pelo servidor,
     * não encontra nenhum conteúdo seguindo os critérios fornecidos pelo agente do usuário.
     * @param {string} [pMessage='Not Acceptable']
     */
    constructor(pMessage = 'Not Acceptable') {
        super(pMessage, 406);
    }
}

class ProxyAuthenticationRequiredError extends MessageError {
    /**
     * Semelhante ao 401 porem é necessário que a autenticação seja feita por um proxy.
     * @param {string} [pMessage='Proxy Authentication Required']
     */
    constructor(pMessage = 'Proxy Authentication Required') {
        super(pMessage, 407);
    }
}

class RequestTimeoutError extends MessageError {
    /**
     * Servidor gostaria de derrubar esta conexão em desuso.
     * @param {string} [pMessage='Request Timeout']
     */
    constructor(pMessage = 'Request Timeout') {
        super(pMessage, 408);
    }
}

class ConflictError extends MessageError {
    /**
     * Requisição está conflitando com o estado corrente do servidor.
     * @param {string} [pMessage='Conflict']
     */
    constructor(pMessage = 'Conflict') {
        super(pMessage, 409);
    }
}

class GoneError extends MessageError {
    /**
     * Esta resposta será enviada quando o conteúdo requisitado foi deletado do servidor
     * @param {string} [pMessage='Gone']
     */
    constructor(pMessage = 'Gone') {
        super(pMessage, 410);
    }
}

class LengthRequiredError extends MessageError {
    /**
     * Campo Content-Length do cabeçalho não foi definido.
     * @param {string} [pMessage='Length Required']
     */
    constructor(pMessage = 'Length Required') {
        super(pMessage, 411);
    }
}

class PreconditionFailedError extends MessageError {
    /**
     * O cliente indicou nos seus cabeçalhos pré-condições que o servidor não atende
     * @param {string} [pMessage='Precondition Failed']
     */
    constructor(pMessage = 'Precondition Failed') {
        super(pMessage, 412);
    }
}

class PayloadTooLargeError extends MessageError {
    /**
     * A entidade requisição é maior do que os limites definidos pelo servidor;
     * o servidor pode fechar a conexão ou retornar um campo de cabeçalho Retry-After.
     * @param {string} [pMessage='Payload Too Large']
     */
    constructor(pMessage = 'Payload Too Large') {
        super(pMessage, 413);
    }
}

class URITooLongError extends MessageError {
    /**
     * A URI requisitada pelo cliente é maior do que o servidor aceita para interpretar.
     * @param {string} [pMessage='URI Too Long']
     */
    constructor(pMessage = 'URI Too Long') {
        super(pMessage, 414);
    }
}

class UnsupportedMediaTypeError extends MessageError {
    /**
     * O formato de mídia dos dados requisitados não é suportado pelo servidor.
     * @param {string} [pMessage='Unsupported Media Type']
     */
    constructor(pMessage = 'Unsupported Media Type') {
        super(pMessage, 415);
    }
}

class RequestedRangeNotSatisfiableError extends MessageError {
    /**
     * O trecho especificado pelo campo Range do cabeçalho na requisição não pode ser preenchido;
     * é possível que o trecho esteja fora do tamanho dos dados da URI alvo.
     * @param {string} [pMessage='Requested Range Not Satisfiable']
     */
    constructor(pMessage = 'Requested Range Not Satisfiable') {
        super(pMessage, 416);
    }
}

class ExpectationFailedError extends MessageError {
    /**
     * Expectativa indicada pelo campo Expect do cabeçalho da requisição não pode ser satisfeita pelo servidor.
     * @param {string} [pMessage='Expectation Failed']
     */
    constructor(pMessage = 'Expectation Failed') {
        super(pMessage, 417);
    }
}

class ImATeapotError extends MessageError {
    /**
     * O servidor recusa a tentativa de coar café num bule de chá.
     * @param {string} [pMessage="I'm a teapot"]
     */
    constructor(pMessage = "I'm a teapot") {
        super(pMessage, 418);
    }
}

class MisdirectedRequestError extends MessageError {
    /**
     * A requisição foi direcionada a um servidor inapto a produzir a resposta.
     * Pode ser enviado por um servidor que não está configurado para produzir respostas para a combinação de esquema ("scheme") e autoridade inclusas na URI da requisição
     * @param {string} [pMessage='Misdirected Request']
     */
    constructor(pMessage = 'Misdirected Request') {
        super(pMessage, 421);
    }
}

class UnprocessableEntityError extends MessageError {
    /**
     * A requisição está bem formada, mas inabilitada para ser seguida devido a erros semânticos.
     * @param {string} [pMessage='Unprocessable Entity']
     */
    constructor(pMessage = 'Unprocessable Entity') {
        super(pMessage, 422);
    }
}

class LockedError extends MessageError {
    /**
     * O recurso solicitado está trancado
     * @param {string} [pMessage='Locked']
     */
    constructor(pMessage = 'Locked') {
        super(pMessage, 423);
    }
}

class FailedDependencyError extends MessageError {
    /**
     * A requisição falhou devido a falha em requisição prévia.
     * @param {string} [pMessage='Failed Dependency']
     */
    constructor(pMessage = 'Failed Dependency') {
        super(pMessage, 424);
    }
}

class UpgradeRequiredError extends MessageError {
    /**
     * O servidor se recusa a executar a requisição usando o protocolo enviado,
     * mas estará pronto a fazê-lo após o cliente atualizar para um protocolo diferente.
     * O servidor envia um cabeçalho Upgrade numa resposta 426 para indicar o(s) protocolo(s) requeridos.
     * @param {string} [pMessage='Upgrade Required']
     */
    constructor(pMessage = 'Upgrade Required') {
        super(pMessage, 426);
    }
}

class PreconditionRequiredError extends MessageError {
    /**
     * O servidor de origem requer que a resposta seja condicional.
     * Feito para prevenir o problema da 'atualização perdida', onde um cliente pega o estado de um recurso (GET),
     * modifica-o, e o põe de volta no servidor (PUT), enquanto um terceiro modificou o estado no servidor, levando a um conflito.
     * @param {string} [pMessage='Precondition Required']
     */
    constructor(pMessage = 'Precondition Required') {
        super(pMessage, 428);
    }
}

class TooManyRequestsError extends MessageError {
    /**
     * O usuário enviou muitas requisições num dado tempo.
     * @param {string} [pMessage='Too Many Requests']
     */
    constructor(pMessage = 'Too Many Requests') {
        super(pMessage, 429);
    }
}

class RequestHeaderFieldsTooLargeError extends MessageError {
    /**
     * Os campos de cabeçalho estão muito grandes.
     * @param {string} [pMessage='Request Header Fields Too Large']
     */
    constructor(pMessage = 'Request Header Fields Too Large') {
        super(pMessage, 431);
    }
}

class UnavailableForLegalReasonsError extends MessageError {
    /**
     * O usuário requisitou um recurso indisponível por questões legais.
     * @param {string} [pMessage='Unavailable For Legal Reasons']
     */
    constructor(pMessage = 'Unavailable For Legal Reasons') {
        super(pMessage, 451);
    }
}

module.exports = {
    BadRequestError,
    UnauthorizedError,
    PaymentRequiredError,
    ForbiddenError,
    NotFoundError,
    MethodNotAllowedError,
    NotAcceptableError,
    ProxyAuthenticationRequiredError,
    RequestTimeoutError,
    ConflictError,
    GoneError,
    LengthRequiredError,
    PreconditionFailedError,
    PayloadTooLargeError,
    URITooLongError,
    UnsupportedMediaTypeError,
    RequestedRangeNotSatisfiableError,
    ExpectationFailedError,
    ImATeapotError,
    MisdirectedRequestError,
    UnprocessableEntityError,
    LockedError,
    FailedDependencyError,
    UpgradeRequiredError,
    PreconditionRequiredError,
    TooManyRequestsError,
    RequestHeaderFieldsTooLargeError,
    UnavailableForLegalReasonsError
};
