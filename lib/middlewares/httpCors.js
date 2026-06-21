/**
 * Middleware para configurar o CORS da requisição HTTP.
 * Cross-origin resource sharing (CORS)(ou compartilhamento de recursos de origem cruzada)
 * é uma especificação de uma tecnologia de navegadores que define meios para um servidor
 * permitir que seus recursos sejam acessados por uma página web de um domínio diferente.
 *
 * @param {Object|null} pOptions Configuração para sobrescrever os headers padrão do CORS.
 * @returns função
 */
const HTTP_CORS_DEFAULT_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'Content-Disposition',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Allow-Headers':
        'Access-Control-Allow-Origin, Access-Control-Request-Method, Access-Control-Request-Headers, Access-Control-Allow-Methods, Content-Type, Accept, X-Requested-With, Authorization',
};

const httpCors = (pOptions = null) => {
    return (pReq, pRes, pNext) => {
        // Quando houver sobrescrita, mescla os valores recebidos com os headers padrão.
        if (pOptions) {
            const xHeaders = {
                ...HTTP_CORS_DEFAULT_HEADERS,
                ...pOptions,
            };

            // Aplica dinamicamente cada header já considerando a configuração recebida.
            Object.keys(xHeaders).forEach((xHeader) => {
                pRes.header(xHeader, xHeaders[xHeader]);
            });
        } else {
            // Mantém o caminho padrão mais simples e direto quando não há customização.
            pRes.header('Access-Control-Allow-Origin', HTTP_CORS_DEFAULT_HEADERS['Access-Control-Allow-Origin']);
            pRes.header('Access-Control-Expose-Headers', HTTP_CORS_DEFAULT_HEADERS['Access-Control-Expose-Headers']);
            pRes.header('Access-Control-Allow-Methods', HTTP_CORS_DEFAULT_HEADERS['Access-Control-Allow-Methods']);
            pRes.header('Access-Control-Allow-Headers', HTTP_CORS_DEFAULT_HEADERS['Access-Control-Allow-Headers']);
        }

        const xMethod = pReq?.method?.toUpperCase && pReq.method.toUpperCase();
        // Requisições de preflight do CORS devem ser encerradas sem seguir para a próxima etapa.
        if (xMethod === 'OPTIONS') {
            pRes.statusCode = 204;
            pRes.setHeader('Content-Length', '0');
            pRes.end();
        } else {
            // Demais métodos continuam normalmente no pipeline da aplicação.
            pNext();
        }
    };
};

module.exports = httpCors;
