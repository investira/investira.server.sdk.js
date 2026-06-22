// @ts-ignore
const { UnauthorizedError } = require('investira.sdk').messages.ClientErrors;
const endpointResponse = require('../middlewares/endpointResponse');

/**
 * Middleware para recuperar os dados 'authorization' do request
 * @returns função
 */
const authorization = pCallback => {
    return endpointResponse((req, pResolve, pReject, pNext) => {
        req.authInfo = {};
        //Verifica se request foi abortado pelo usuário
        if (req.aborted) {
            return pResolve();
        }
        if (req?.headers?.authorization) {
            //Chama rota normal de validação de token sem controle de perfil de acesso
            req.headers.authorization = String(req.headers.authorization).trim();
            let xParts = req.headers.authorization.split(' ');
            if (!req.headers.authorization || xParts.length !== 2) {
                return pReject(new UnauthorizedError('Credential Required'));
            }
            let xScheme = xParts[0];
            //Bearer Token
            if (/^Bearer$/i.test(xScheme)) {
                req.authInfo.token = xParts[1];
            }
            //Credential
            if (/^Basic$/i.test(xScheme)) {
                let xCredential = Buffer.from(xParts[1], 'base64') // New
                    .toString()
                    .split(':');
                if (xCredential.length < 2) {
                    return pReject(new UnauthorizedError('Username Or Password Not Provided'));
                }

                if (!xCredential[0] || !xCredential[1]) {
                    return pReject(new UnauthorizedError('Username Or Password Not Provided'));
                }
                req.authInfo.username = xCredential[0];
                req.authInfo.password = xCredential[1];
            }
            //Chama função informada, passando os dados da autenticação e função para que deverá ser chamada para dar continuidade ao request
            pCallback(req.authInfo, pErr => {
                if (pErr) {
                    return pReject(pErr);
                } else {
                    pNext();
                }
            });
        } else {
            pReject(new UnauthorizedError('Credential Required'));
        }
    });
};

module.exports = authorization;
