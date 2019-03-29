/**
 * Middleware para configurar o CORS da requisição HTTP.
 * Cross-origin resource sharing (CORS)(ou compartilhamento de recursos de origem cruzada)
 * é uma especificação de uma tecnologia de navegadores que define meios para um servidor
 * permitir que seus recursos sejam acessados por uma página web de um domínio diferente.
 *
 * @returns função
 */
const httpCors = () => {
    //@ts-ignore
    return (req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header(
            'Access-Control-Allow-Methods',
            'GET, POST, OPTIONS, PUT, DELETE, PATCH'
        );
        res.header(
            'Access-Control-Allow-Headers',
            'Access-Control-Allow-Origin, Access-Control-Request-Method, Access-Control-Request-Headers, Access-Control-Allow-Methods, Content-Type, Accept, X-Requested-With, Authorization'
            // 'Origin, X-Requested-With, Content-Type, Accept'
        );
        const xMethod =
            req.method && req.method.toUpperCase && req.method.toUpperCase();
        if (xMethod === 'OPTIONS') {
            res.statusCode = 204;
            res.setHeader('Content-Length', '0');
            res.end();
        } else {
            next();
        }
    };
};

module.exports = httpCors;
