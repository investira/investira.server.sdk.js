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
            'GET, POST, OPTIONS, PUT, DELETE'
        );
        res.header(
            'Access-Control-Allow-Headers',
            'Origin, X-Requested-With, Content-Type, Accept'
        );
        next();
    };
};

module.exports = httpCors;
