const { isEmpty, isObject } = require('investira.sdk').validators;
// responseData: (pRes, pData.message, pData, pMetadata, pPages, pIncludes) => {
const httpResponses = {
    /**
     * Executa response redirecionando para a URL definida em pRedirectURI
     * contendo os dados informados no objeto pResponseObject.
     *
     * @param {} pRes Response HTTP
     * @param {*} [pResponseObject={}] Objeto com os dados da resposta devendo conter ao menos uma das seguintes propriedades:
     * 								   - message: Objeto "message" contendo erro ou mensagem
     * 								   - data: Objeto com os dados solicitados
     * 								   - metadata: Informações sobre os dados solicitados
     * 								   - pages: Objeto contendo os atributos:
     * 										- - self: URL para a página corrente.
     * 										- - first: URL para a primeira página, se houver.
     * 										- - previous: URL para a página anterior, se houver.
     * 										- - next: URL para a próxima página, se houver.
     * 										- - last: URL para a última página, se houver.
     * 									- includes: Objeto contendo dados adicionais aos dados infomados em 'data'
     *
     * @param {*} [pRedirectURL=null] URL para onde será redirecionado a resposta.
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
            xResponse.error = pResponseObject.message;
        }
        if (!isEmpty(pResponseObject.data) || isObject(pResponseObject.data)) {
            xResponse.data = pResponseObject.data;
        }
        if (
            !isEmpty(pResponseObject.metadata) ||
            isObject(pResponseObject.metadata)
        ) {
            xResponse.metadata = pMetadata;
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
