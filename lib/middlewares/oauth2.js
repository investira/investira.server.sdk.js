// const oauth2 = () => {
//     return (req, res, next) => {
//         var xType = req.body.grant_type;

//         next();
//     };
// };
const { responseData } = require('../utils/httpResponses');

const oauth2 = pSource => {
    //Define métodos padrão, que serão sobrescritos,
    //caso tenha sido definidos em pSource
    let abstract = Object.assign(
        {
            async getToken(req) {
                var xType = req.body.grant_type;
                gLog.silly(xType);
                if (xType == 'client_credentials') {
                    return await this.clientCredentials(req.user, null);
                } else if (xType == 'password') {
                    return await this.password(
                        req.user,
                        req.body.username,
                        req.body.password,
                        req.body.scope || null
                    );
                } else if (xType == 'refresh_token') {
                    return await this.refreshToken(
                        req.user,
                        req.body.refresh_token,
                        req.body.scope || null
                    );
                } else if (xType == 'autorization_code') {
                    //(pClient, pCode, pRedirectURI, pBody, pAuthInfo, pDone)
                    return await this.authorizationCode(
                        req.user,
                        null,
                        null,
                        null,
                        null
                    );
                }
            },
            /**
             * Dados do client
             *
             * @param {*} pClient Dados do client
             * @param {*} pScope
             * @returns
             */
            clientCredentials(pClient, pScope) {
                gLog.silly('abstract clientCredentials');
                return Promise.resolve();
            },
            /**
             *
             *
             * @param {*} pClient Dados do client
             * @param {*} pUsername Nome do usuário
             * @param {*} pPassword senha
             * @param {*} pScope
             * @returns
             */
            password(pClient, pUsername, pPassword, pScope) {
                gLog.silly('abstract password');
                return Promise.resolve();
            },
            /**
             *
             *
             * @param {*} pClient Dados do client
             * @param {*} pRefreshToken Refresh token
             * @param {*} pScope
             * @returns
             */
            refreshToken(pClient, pRefreshToken, pScope) {
                gLog.silly('abstract refreshToken');
                return Promise.resolve();
            },
            /**
             *
             *
             * @param {*} pClient Dados do client
             * @param {*} pCode
             * @param {*} pRedirectURI
             * @param {*} pBody
             * @param {*} pAuthInfo
             * @returns
             */
            authorizationCode(pClient, pCode, pRedirectURI, pBody, pAuthInfo) {
                gLog.silly('abstract authorizationCode');
                return Promise.resolve();
            }
        },
        pSource
    );

    return (req, res, next) => {
        gLog.debug('oauth2 middleware');
        abstract
            .getToken(req)
            .then(rResult => {
                // responseData(res, null, rResult);
                next();
            })
            .catch(rErr => {
                // responseData(res, rErr);
                next();
            });
    };
};

//Midware do httpserver para configurar as origens diferentes
module.exports = oauth2;

// authServer.exchange(
//     oauth2orize.exchange.authorizationCode(
//         (pClient, pCode, pRedirectURI, pBody, pAuthInfo, pDone) => {
//             gLog.debug('authServer.exchange:authorizationCode');
//             //Teste se usuário existe

//             return pDone(null, 'tttt', 'uuuu', {
//                 expires_in: 66666
//             });
//         }
//     )
// );

// // grant_type = password
// // Cria accessToken e refreshToken a partir usuário
// authServer.exchange(
//     oauth2orize.exchange.password(
//         (pClient, pUsername, pPassword, pScope, pDone) => {
//             gLog.debug('authServer.exchange:password');
//             //Cria AccessToken do usuário
//             userAccessTokenIssue(pClient, pUsername, pPassword, pScope)
//                 .then(rResult => {
//                     return pDone(
//                         null,
//                         rResult.access_token,
//                         rResult.refresh_token,
//                         {
//                             expires_in: rResult.expires_in
//                         }
//                     );
//                 })
//                 .catch(rErr => {
//                     gLog.error(rErr);
//                     return pDone(rErr);
//                 });
//         }
//     )
// );

// // grant_type = refresh_token
// // Cria novo accessToken a partir do refreshToken
// authServer.exchange(
//     oauth2orize.exchange.refreshToken(
//         (pClient, pRefreshToken, pScope, pDone) => {
//             gLog.debug('authServer.exchange:refreshToken');
//             //Cria RefreshToken do usuário
//             userAccessTokenRefresh(pClient, pRefreshToken)
//                 .then(rResult => {
//                     return pDone(
//                         null,
//                         rResult.access_token,
//                         rResult.refresh_token,
//                         {
//                             expires_in: rResult.expires_in
//                         }
//                     );
//                 })
//                 .catch(rErr => {
//                     gLog.error(rErr);
//                     return pDone(rErr);
//                 });
//         }
//     )
// );
// // grant_type = client_credentials
// // Cria AccessToken do client
// authServer.exchange(
//     oauth2orize.exchange.clientCredentials((pClient, pScope, pDone) => {
//         gLog.debug('authServer.exchange:clientCredentials');
//         //Cria ClientAccessToken
//         clientAccessTokenIssue(pClient)
//             .then(rResult => {
//                 return pDone(null, rResult.access_token, {
//                     expires_in: rResult.expires_in
//                 });
//             })
//             .catch(rErr => {
//                 gLog.error(rErr);
//                 return pDone(rErr);
//             });
//     })
// );
