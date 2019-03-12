const { isEmpty, isObject, isFunction } = require('investira.sdk').validators;
const { InternalServerError } = require('../messages/ServerErrors');
const MessageError = require('../messages/MessageError');
// const xEvents = require('events');
// const beforeResponseSend = new xEvents();

/**
 * Controla respostas padrão.
 * ex:
 *  endpointResponse((req, pResolve, pReject, pNext) => {
 *	anyPromise(req.body)
 *		.then(rResult => {
 *			pResolve({ data: xResult });
 *		})
 *		.catch(rErr => {
 *			pReject({ message: rErr });
 *		});
 * })
 *
 * @param {*} pFunctionToExecute Função a ser executada que receberá:
 * - req: Dados do http request
 * - success: Função de callback com o objeto contendo os dados a serem respondidos
 * - fail: Função de callback com o objeto com os dados sobre o erro
 * - next: Próximos rotinas na fila
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
const endpointResponse = pFunctionToExecute => {
    const SuccessResponse = (req, res, next) => {
        pFunctionToExecute(
            req,
            pResolvedData => {
                if (isEmpty(pResolvedData)) {
                    pvSendInvalidResponse(res);
                }
                pvSendValidResponse(res, pResolvedData);
            },
            pRejectedData => {
                if (isEmpty(pRejectedData) || isEmpty(pRejectedData.message)) {
                    pvSendInvalidResponse(res);
                } else {
                    let xResponseData = pRejectedData;
                    if (pRejectedData instanceof Error) {
                        xResponseData = { message: pRejectedData };
                        gLog.error(pRejectedData);
                    } else if (pRejectedData.message instanceof Error) {
                        gLog.error(pRejectedData.message);
                    }
                    pvSendValidResponse(res, xResponseData);
                }
            },
            next
        );
    };
    const FailResponse = (err, _req, res, _next) => {
        pvSendValidResponse(res, { message: err });
    };
    return [SuccessResponse, FailResponse];
};

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
const pvSendValidResponse = (
    pRes,
    pResponseObject = {},
    pRedirectURL = null
) => {
    if (isEmpty(pResponseObject) && isEmpty(pRedirectURL)) {
        return;
    }
    let xResponse = {};
    //Message or Error
    if (!isEmpty(pResponseObject.message)) {
        if (pResponseObject.message instanceof MessageError) {
            pRes.statusCode = pResponseObject.message.status || pRes.statusCode;
            const xMessage = {};
            xMessage.code = pResponseObject.message.code;
            xMessage.description = pResponseObject.message.message;
            //Responde com o atributo erro
            if (pRes.statusCode >= 400) {
                xResponse.error = xMessage;
            } else {
                xResponse.message = xMessage;
            }
        } else {
            xResponse.message = pResponseObject.message;
        }
    }
    //Data
    if (!isEmpty(pResponseObject.data) || isObject(pResponseObject.data)) {
        xResponse.data = pResponseObject.data;
    }
    //Metadata
    if (
        !isEmpty(pResponseObject.metadata) ||
        isObject(pResponseObject.metadata)
    ) {
        xResponse.metadata = pResponseObject.metadata;
    }
    //Pages
    if (!isEmpty(pResponseObject.pages) || isObject(pResponseObject.pages)) {
        xResponse.pages = pResponseObject.pages;
    }
    //Includes
    if (
        !isEmpty(pResponseObject.includes) ||
        isObject(pResponseObject.includes)
    ) {
        xResponse.includes = pResponseObject.includes;
    }
    // beforeResponseSend.emit('beforeSend', pRes, res);

    //Verifica se há controle de transação para
    //efetuar rollback ou commit conforme o status,
    //antes de enviar a resposta.
    //Controle de transação é criado pelo requestContextMiddleware
    if (pRes.hasOwnProperty('locals')) {
        //Verifica se há função foi criada
        if (isFunction(pRes.locals.endTransaction)) {
            //Efetua commit ou rollback conforme o status
            pRes.locals.endTransaction().then(() => {
                pRes.json(xResponse);
                pRes.end();
            });
        }
    } else {
        pRes.json(xResponse);
        pRes.end();
    }
};

const pvSendInvalidResponse = res => {
    gLog.error(
        new InternalServerError('Message was not provided on response reject')
    );
    pvSendValidResponse(res, new InternalServerError());
};

module.exports = endpointResponse;