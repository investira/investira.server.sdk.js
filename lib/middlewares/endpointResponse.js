// @ts-ignore
const { isEmpty, isObject, isFunction } = require('investira.sdk').validators;
// @ts-ignore
const { BasicMessageError } = require('investira.sdk').messages.BasicMessages;
const { InternalServerError } = require('investira.sdk').messages.ServerErrors;

/**
 * Controla respostas padrão.
 * ex:
 *  endpointResponse((req, pResolve, pReject, pNext) => {
 *	anyPromise(req.body)
 *		.then(rResult => {
 *			pResolve({ data: xResult });
 *		})
 *		.catch(rErr => {
 *			pReject(rErr);
 *		});
 * })
 *
 * @param {function} pFunctionToExecute Função a ser executada que receberá:
 * - req: Dados do http request
 * - success: Função de callback que recebe objeto contendo os dados a serem respondidos conforme descrição abaixo
 * - fail: Função de callback que recebe somente objeto 'message' com o erro ou os dados a serem respondidos conforme descrição abaixo
 * - next: Chama próximas rotinas na fila
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
        //Não continua se request foi cancelado pelo usuário
        if (req.aborted) {
            return null;
        }
        //Configura dos parametros de página, offset, size e sort, caso existam.
        pvConfigClauses(req);
        //Executa pFunctionToExecute
        pFunctionToExecute(
            req,
            //Função quando há sucesso
            pResolvedData => {
                pvSendValidResponse(res, pResolvedData);
            },
            //Função quando há erro
            pRejectedData => {
                // @ts-ignore
                const xLog = gLog.child({ _origin: { class: 'endpointResponse', function: 'SuccessResponse' } });
                //Normaliza mensagem de erro
                let xResponseData = pRejectedData;
                if (pRejectedData.isBasicMessage) {
                    //Log da mensagem original
                    // @ts-ignore
                    xLog.error(pRejectedData.message);
                    xResponseData = { message: pRejectedData };
                    //Verifica se mensagem é um erro
                } else if (pRejectedData.isBasicMessageError || pRejectedData instanceof Error) {
                    //Log da mensagem original
                    // @ts-ignore
                    xLog.error(pRejectedData);
                    xResponseData = { message: pRejectedData };
                } else if (pRejectedData.message && pRejectedData.message.isBasicMessage) {
                    //Log da mensagem original
                    // @ts-ignore
                    xLog.error(pRejectedData.message);
                    xResponseData = { message: pRejectedData.message };
                    //Converte mensagem fora do padrão para mensagem padronizada
                } else if (
                    (pRejectedData.message && pRejectedData.message.isBasicMessageError) ||
                    pRejectedData.message instanceof Error
                ) {
                    //Log da mensagem original
                    // @ts-ignore
                    xLog.error(pRejectedData.message);
                    xResponseData = { message: new InternalServerError() };
                } else {
                    const xMessage = pRejectedData.statusText || pRejectedData;
                    const xStatus = pRejectedData.status || 500;

                    const xError = new BasicMessageError({
                        error: { description: xMessage, code: { status: xStatus } }
                    });
                    xLog.error(xError);
                    //Cria mensagem padrão;
                    xResponseData = { message: xError };
                }
                pvSendValidResponse(res, xResponseData);
            },
            next
        );
    };
    const FailResponse = (err, _req, res, _next) => {
        pvSendInvalidResponse(res, err);
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
const pvSendValidResponse = (pRes, pResponseObject = {}, pRedirectURL = null) => {
    let xResponse = {};

    //mensagem de Sucesso or Error
    if (!isEmpty(pResponseObject.message)) {
        //Se é um objeto message...(objeto message é controlado por este sdk)
        if (pResponseObject.message.isBasicMessage) {
            //Configura statusCode do response para garantir o rollback da transação, caso exista.
            pRes.statusCode = pResponseObject.message.status || pRes.statusCode;
            //Cria objeto com os dados de mensagem/erro
            const xMessage = {
                code: pResponseObject.message.code,
                description: pResponseObject.message.message
            };
            //Verica o tipo de mensagem para retornar com o respectivo atributo (message ou error)
            if (pResponseObject.message.isBasicMessageSuccess) {
                //Retorna mensagem com sucesso
                xResponse.message = xMessage;
            } else {
                //Retorna mensagem com erro
                xResponse.error = xMessage;
            }
        } else if (['error', 'emerg'].includes(pResponseObject.message.level)) {
            //Força o registro de erro na resposta para erros não tratados
            pRes.statusCode = 500;
            xResponse.error = { code: pRes.statusCode, description: 'Server Error' };
        } else {
            xResponse.message = pResponseObject.message;
        }
    }
    //Data
    if (!isEmpty(pResponseObject.data) || isObject(pResponseObject.data)) {
        xResponse.data = pResponseObject.data;
    }
    //Metadata
    if (!isEmpty(pResponseObject.metadata) || isObject(pResponseObject.metadata)) {
        xResponse.metadata = pResponseObject.metadata;
    }
    //Pages
    if ((!xResponse.error && !isEmpty(pResponseObject.pages)) || isObject(pResponseObject.pages)) {
        xResponse.pages = pResponseObject.pages;
        //Paginação
        if (pResponseObject.pages.url) {
            xResponse.pages = pvConfigPages(pRes.req.clauses, pResponseObject.pages);
        }
    }
    //Includes
    if (!isEmpty(pResponseObject.includes) || isObject(pResponseObject.includes)) {
        xResponse.includes = pResponseObject.includes;
    }

    //Verifica se há controle de transação para efetuar rollback ou commit conforme o status, antes de enviar a resposta.
    //Controle de transação é criado pelo requestContextMiddleware
    //Verifica se foi criada, no requestContextMiddleware, a função para controle de transação
    if (pRes.hasOwnProperty('locals') && isFunction(pRes.locals.endTransaction)) {
        //Efetua commit ou rollback conforme o status
        pRes.locals.endTransaction().then(() => {
            //Finaliza resposta
            pvRespond(pRes, xResponse, pRedirectURL);
        });
    } else {
        //Finaliza resposta
        pvRespond(pRes, xResponse, pRedirectURL);
    }
};

/**
 * Finaliza Resposta
 *
 * @param {object} res
 * @param {object} pResponse
 * @param {string} pRedirectURL
 */
const pvRespond = (res, pResponse, pRedirectURL) => {
    if (pRedirectURL) {
        return res.redirect(res.statusCode, pRedirectURL);
    }
    if (isEmpty(pResponse)) {
        res.end();
    } else {
        res.json(pResponse);
    }
};

/**
 * Resposta padrão quando foi dedectado erro não tratado até a finalização da resposta
 *
 * @param {*} res
 * @param {*} pErr
 */
const pvSendInvalidResponse = (res, pErr) => {
    // @ts-ignore
    const xLog = gLog.child({ _origin: { class: 'endpointResponse', function: 'FailResponse' } });
    // @ts-ignore
    xLog.warn(`Please, try to correct this error before it reaches this point!`);
    // @ts-ignore
    xLog.error(pErr, { showStack: true });
    pvSendValidResponse(res, { message: new InternalServerError() });
};

/**
 * Configuração de página, offset, size e sort
 *
 * @param {object} req
 */
const pvConfigClauses = req => {
    if (req.query && !req.clauses) {
        //Parametros de Busca
        let { page = 0, offset = 0, size = null, sort = null, ...xQuery } = req.query;
        req.clauses = {
            limit: { page, offset, size },
            sort: req.query.sort
        };
        req.query = xQuery;
    }
};

const { toNumber, add, sub, div, round, apart } = require('investira.sdk').numbers;
/**
 * Configura os links de paginação
 *
 * @param {object} pClauses Objeto com {page e size}
 * @param {object} pPages Total de registros na consulta sem limitações {total_itens, url}
 * @returns {object} Objeto com os links para paginação
 */
const pvConfigPages = (pClauses, pPages) => {
    if (!pClauses || !pClauses.limit || !pClauses.limit.size) {
        return null;
    }
    pPages = { total_itens: 0, url: null, ...pPages };
    const xLimit = pClauses.limit;
    let xPagesCount = div(pPages.total_itens, toNumber(xLimit.size));
    const xAux = apart(xPagesCount);
    if (xPagesCount < 1) {
        xPagesCount = 1;
    } else if (toNumber(xAux.dec) != 0 && sub(xPagesCount, toNumber(xAux.int)) < 0.5) {
        xPagesCount = add(toNumber(xAux.int), 1);
    } else {
        xPagesCount = round(xPagesCount, 0);
    }

    let xPageLinks = {};
    let xSize = '';
    let xPage = 1;

    if (xLimit && xLimit.page && xPagesCount > 1) {
        //Define o campo size
        if (xLimit.size) {
            xSize = `&size=${xLimit.size}`;
        }
        //Define o campo page
        if (xLimit.page && xLimit.page > 1) {
            //Paginação - first
            // xSearchLinks.put("firstPage", pPath+"?page=1"+xSize+xSort);
            xPageLinks.first = `${pPages.url}?page=1${xSize}`;
            //Paginação - Prev
            xPage = sub(toNumber(xLimit.page), 1);
            xPageLinks.prev = `${pPages.url}?page=${xPage}${xSize}`;
        }
        if (xLimit.page && xLimit.page < xPagesCount && xLimit.page >= 1) {
            //Paginação - Next
            xPage = add(toNumber(xLimit.page), 1);
            xPageLinks.next = `${pPages.url}?page=${xPage}${xSize}`;
            //Paginação - Last
            xPageLinks.last = `${pPages.url}?page=${xPagesCount}${xSize}`;
        }
    }
    //Total de Páginas
    return {
        ...xPageLinks,
        total_pages: xPagesCount,
        total_itens: pPages.total_itens
    };
};

module.exports = endpointResponse;
