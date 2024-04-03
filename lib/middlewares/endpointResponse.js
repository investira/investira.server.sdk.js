const url = require('url');
// @ts-ignore
const { isEmpty, isObject, isFunction, isString, isNumber } = require('investira.sdk').validators;
// @ts-ignore
const { BasicMessageError } = require('investira.sdk').messages.BasicMessages;
// @ts-ignore
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
    const successResponse = (req, res, next) => {
        //Não continua se request foi cancelado pelo usuário
        if (req.aborted) {
            return res.end();
        }
        //Configura dos parametros de página, offset, size e sort, caso existam.
        pvConfigClauses(req);
        //Executa pFunctionToExecute
        pFunctionToExecute(
            req,
            //Função quando há sucesso
            pResolvedData => {
                //Interrompe resposta
                if (res.req.aborted) {
                    return res.end();
                }
                pvSendValidResponse(res, pResolvedData);
            },
            //Função quando há erro
            pRejectedData => {
                //Interrompe resposta
                if (res.req.aborted) {
                    return res.end();
                }
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
    const failResponse = (err, req, res, _next) => {
        //Interrompe resposta
        if (req.aborted) {
            return res.end();
        }
        pvSendInvalidResponse(res, err);
    };
    return [successResponse, failResponse];
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
    if (pResponseObject.hasOwnProperty('message')) {
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
    if (pResponseObject.hasOwnProperty('data')) {
        xResponse.data = pResponseObject.data;
    }
    //Metadata
    if (pResponseObject.hasOwnProperty('metadata')) {
        xResponse.metadata = pResponseObject.metadata;
    }
    //Pages
    const xClauses = pRes.req.clauses;
    //Somente configura attributo de controle de pagina se for definido o atributo 'size'
    if (
        !xResponse.error &&
        xClauses &&
        xClauses.limit &&
        xClauses.limit.size &&
        pResponseObject.pages &&
        isObject(pResponseObject.pages)
    ) {
        xResponse.pages = pResponseObject.pages;
        //Paginação
        xResponse.pages = pvConfigPages(pRes.req, pResponseObject.pages);
    }
    //Includes
    if (pResponseObject.includes || isObject(pResponseObject.includes)) {
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
    // console.log('Response');
    // console.log(res.statusCode);
    // console.log(pResponse);
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
 * @param {*} pRes
 * @param {*} pErr
 */
const pvSendInvalidResponse = (pRes, pErr) => {
    // @ts-ignore
    const xLog = gLog.child({ _origin: { class: 'endpointResponse', function: 'FailResponse' } });
    // @ts-ignore
    xLog.warn(`Please, try to correct this error before it reaches this point!`);
    xLog.error(pErr);
    // Quando o erro do body-parser não é do tipo "Error" o atributo message se perde
    if (!(pErr instanceof Error)) {
        pErr = new Error(pErr);
    }
    // @ts-ignore
    pvSendValidResponse(pRes, { message: new InternalServerError() });
};

/**
 * Configuração de página, offset, size e sort
 *
 * @param {object} req
 */
const pvConfigClauses = req => {
    if (!req.query) {
        console.log('stop');
    }
    if (req.query && req.originalUrl && !req.clauses) {
        //Parametros de Busca
        let { page = null, size = null, sort = null, ...xQuery } = req.query;
        req.clauses = {
            sort: req.query.sort || null
        };
        //Somente configura attributo de controle de página se foi definido o atributo 'size' no request
        size = toNumber(size);
        if (isNumber(size) && size > 1) {
            page = toNumber(page);
            req.clauses.limit = {
                size: size,
                page: isNumber(page) ? page : 1
            };
        }
        req.query = xQuery;
        //Copiar a query para podermos recupera-la independente se ela for editada
        req._query = { ...xQuery };
    }
};

const { toNumber, add, sub, div, round, apart } = require('investira.sdk').numbers;
/**
 * Configura os links de paginação
 *
 * @param {object} pReq Req
 * @param {object} pPages Total de registros na consulta sem limitações {total_items}
 * @returns {object} Objeto com os links para paginação
 */
const pvConfigPages = (pReq, pPages) => {
    const xClauses = pReq.clauses;
    //Seta total_items con default de 0 se não existir
    pPages = { total_items: 0, ...pPages };
    const xLimit = xClauses.limit;
    //Calcula quantidade de páginas
    let xPagesCount = 0;
    if (pPages.total_items) {
        xPagesCount = div(pPages.total_items, xLimit.size);
    }
    const xAux = apart(xPagesCount);
    if (xPagesCount < 1) {
        xPagesCount = 1;
    } else if (toNumber(xAux.dec) !== 0 && sub(xPagesCount, toNumber(xAux.int)) < 0.5) {
        xPagesCount = add(toNumber(xAux.int), 1);
    } else {
        xPagesCount = round(xPagesCount, 0);
    }

    //COnfigura links
    let xPageLinks = {};
    let xPage = 1;
    if (xLimit && xLimit.hasOwnProperty('page') && xPagesCount > 1) {
        //Define a ultima pagina
        if (xLimit.page > xPagesCount) {
            xLimit.page = xPagesCount;
        }

        //Define o campo page
        if (xLimit.page > 1) {
            //Paginação - first
            xPageLinks.first = pvBuildUrl(pReq, xLimit.size, 1);
            //Paginação - Prev
            xPage = xLimit.page - 1;
            xPageLinks.prev = pvBuildUrl(pReq, xLimit.size, xPage);
        }
        if (xLimit.page < xPagesCount && xLimit.page >= 1) {
            //Paginação - Next
            xPage = xLimit.page + 1;
            xPageLinks.next = pvBuildUrl(pReq, xLimit.size, xPage);
            //Paginação - Last
            xPageLinks.last = pvBuildUrl(pReq, xLimit.size, xPagesCount);
        }
    }
    return {
        ...xPageLinks,
        total_pages: xPagesCount,
        total_items: pPages.total_items
    };
};

const pvBuildUrl = (pReq, pSize, pPage) => {
    const xQuery = pReq._query || pReq.query;
    const xQueryObj = {
        ...xQuery,
        page: pPage,
        size: pSize
    };
    return url.format({
        // protocol: pReq.protocol,
        // hostname: pReq.hostname,
        // port: pReq.socket.localPort,
        pathname: pReq.originalUrl.split('?')[0],
        query: xQueryObj
    });
};

module.exports = endpointResponse;
