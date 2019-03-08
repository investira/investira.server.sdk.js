const { sendResponse } = require('../utils/httpResponses');

const oauth2Token = pSource => {
    /**
     * Retorna token
     *
     * @param {object} req Request HTTP
     * @returns
     */
    const getToken = async req => {
        var xType = req.body.grant_type;
        gLog.silly(`oauth2Token middleware ${xType}`);
        if (xType == 'client_credentials') {
            return await abstract.clientCredentials(req.user, null);
        } else if (xType == 'password') {
            return await abstract.password(
                req.user,
                req.body.username,
                req.body.password,
                req.body.scope || null
            );
        } else if (xType == 'refresh_token') {
            return await abstract.refreshToken(
                req.user,
                req.body.refresh_token,
                req.body.scope || null
            );
        } else if (xType == 'autorization_code') {
            //(pClient, pCode, pRedirectURI, pBody, pAuthInfo, pDone)
            return await abstract.authorizationCode(
                req.user,
                null,
                null,
                null,
                null
            );
        }
    };

    //Define métodos padrão, que serão sobrescritos,
    //caso tenha sido definidos em pSource
    let abstract = Object.assign(
        {
            // grant_type:client_credentials
            // client_id:
            // client_secret:
            // {
            // 	"access_token": ,
            // 	"expires_in": ,
            // 	"token_type": "Bearer"
            // }
            /**
             * Dados do client
             *
             * @param {object} pClient Dados do client
             * @param {string} pScope
             * @returns
             */
            //@ts-ignore
            clientCredentials(pClient, pScope) {
                gLog.silly('oauth2Token middleware abstract clientCredentials');
                return Promise.resolve();
            },

            // grant_type:password
            // client_id:
            // client_secret:
            // username:
            // password:
            // {
            // 	"access_token": ,
            // 	"refresh_token": ,
            // 	"expires_in": ,
            // 	"token_type": "Bearer"
            // }
            /**
             *
             *
             * @param {object} pClient Dados do client
             * @param {string} pUsername Nome do usuário
             * @param {string} pPassword senha
             * @param {string} pScope
             * @returns
             */
            //@ts-ignore
            password(pClient, pUsername, pPassword, pScope) {
                gLog.silly('oauth2Token middleware abstract password');
                return Promise.resolve();
            },

            // grant_type:refresh_token
            // client_id:investira
            // client_secret:8ad35a04698785cb3405088cbfa6df08401e4230f7ed4686b1fd6c338de69fe6dc07ea884516ebbbac523fb842ec2c7a7414a765caf72e8575b2254b09246320
            // refresh_token:$2b$04$AWwd/UCaagDFwwqcrPQcZeon/o6rXlJ/beQgw.bcsi/f/JwRnllUq
            // {
            // 	"access_token": "$2b$04$H2onu/sTrEp572RNKuNm6epVAYa3vR4G5LOs7MqrlygFaHxRSanaa",
            // 	"refresh_token": "$2b$04$CSTJ.YcLS5oEeAwNbdD3P.axvDTwbULaFV9fUeY.fYadRIZ6QbJPO",
            // 	"expires_in": 3600,
            // 	"token_type": "Bearer"
            // }
            /**
             *
             *
             * @param {object} pClient Dados do client
             * @param {string} pRefreshToken Refresh token
             * @param {string} pScope
             * @returns
             */
            //@ts-ignore
            refreshToken(pClient, pRefreshToken, pScope) {
                gLog.silly('oauth2Token middleware abstract refreshToken');
                return Promise.resolve();
            },
            // grant_type:authorization_code
            // client_id:
            // client_secret:
            // code:
            // {
            // 	"access_token":
            // 	"refresh_token": ,
            // 	"expires_in": ,
            // 	"token_type": "Bearer"
            // }
            /**
             *
             *
             * @param {object} pClient Dados do client
             * @param {string} pCode
             * @param {string} pRedirectURI
             * @param {object} pBody
             * @param {object} pAuthInfo
             * @returns
             */
            //@ts-ignore
            authorizationCode(pClient, pCode, pRedirectURI, pBody, pAuthInfo) {
                gLog.silly('oauth2 middleware abstract authorizationCode');
                return Promise.resolve();
            }
        },
        pSource
    );

    return Object.freeze(async (req, res, _next) => {
        gLog.debug('oauth2Token middleware');
        await getToken(req)
            .then(rResult => {
                sendResponse(res, {
                    data: { ...rResult, token_type: 'Bearer' }
                });
            })
            .catch(rErr => {
                sendResponse(res, { message: rErr });
            });
    });
};

//Midware do httpserver para configurar as origens diferentes
module.exports = oauth2Token;
