const { isEmpty, isObject } = require('investira.sdk').validators;
// const { InternalServerError } = require('../messages/ServerErrors');

const httpResponses = {
    /**
     * Controla respostas padrão
     *
     * @param {*} pFunctionToExecute Função a ser executada que receberá:
     * - req: Dados do http request
     * - success: Função de callback com o objeto contendo os dados a serem respondidos
     * - fail: Função de callback com o objeto com os dados sobre o erro
     *
     * @returns
     * - message: Objeto "message" contendo erro ou mensagem
     * - data: Objeto com os dados solicitados
     * - metadata: Informações sobre os dados solicitados
     * - pages: Objeto contendo os atributos:
     * - - self: URL para a página corrente.
     * - - first: URL para a primeira página, se houver.
     * - - previous: URL para a página anterior, se houver.
     * - - next: URL para a próxima página, se houver.
     * - - last: URL para a última página, se houver.
     * - includes: Objeto contendo dados adicionais aos dados infomados em 'data'
     */
    routeResponse: pFunctionToExecute => {
        const SuccessResponse = (req, res, next) => {
            pFunctionToExecute(
                req,
                pResolvedData => {
                    httpResponses.sendResponse(res, pResolvedData);
                },
                pRejectedData => {
                    httpResponses.sendResponse(res, pRejectedData);
                }
            );
        };
        const FailResponse = (err, req, res, next) => {
            //new InternalServerError()
            httpResponses.sendResponse(res, { message: err });
        };
        return [SuccessResponse, FailResponse];
    },

    /**
     * Executa response redirecionando para a URL definida em pRedirectURI
     * contendo os dados informados no objeto pResponseObject.
     *
     * @param {object} pRes Response HTTP
     * @param {object} [pResponseObject={}] Objeto com os dados da resposta devendo conter ao menos uma das seguintes propriedades:
     * - message: Objeto "message" contendo erro ou mensagem
     * - data: Objeto com os dados solicitados
     * - metadata: Informações sobre os dados solicitados
     * - pages: Objeto contendo os atributos:
     * - - self: URL para a página corrente.
     * - - first: URL para a primeira página, se houver.
     * - - previous: URL para a página anterior, se houver.
     * - - next: URL para a próxima página, se houver.
     * - - last: URL para a última página, se houver.
     * - includes: Objeto contendo dados adicionais aos dados infomados em 'data'
     *
     * @param {string} [pRedirectURL=null] URL para onde será redirecionada a resposta.
     */
    sendResponse: (pRes, pResponseObject = {}, pRedirectURL = null) => {
        if (isEmpty(pResponseObject) && isEmpty(pRedirectURL)) {
            return;
        }
        let xResponse = {};
        if (
            !isEmpty(pResponseObject.message) ||
            isObject(pResponseObject.message)
        ) {
            pRes.statusCode = pResponseObject.message.status || pRes.statusCode;
            const xMessage = {
                code: pResponseObject.message.code,
                description: pResponseObject.message.message
            };
            if (pRes.statusCode >= 400) {
                xResponse.error = xMessage;
            } else {
                xResponse.message = xMessage;
            }
        }
        if (!isEmpty(pResponseObject.data) || isObject(pResponseObject.data)) {
            xResponse.data = pResponseObject.data;
        }
        if (
            !isEmpty(pResponseObject.metadata) ||
            isObject(pResponseObject.metadata)
        ) {
            xResponse.metadata = pResponseObject.metadata;
        }
        if (
            !isEmpty(pResponseObject.pages) ||
            isObject(pResponseObject.pages)
        ) {
            xResponse.pages = pResponseObject.pages;
        }
        if (
            !isEmpty(pResponseObject.includes) ||
            isObject(pResponseObject.includes)
        ) {
            xResponse.includes = pResponseObject.includes;
        }
        pRes.json(xResponse);
        pRes.end();
    }
};

module.exports = httpResponses;
