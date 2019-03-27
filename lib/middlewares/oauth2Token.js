const { isEmpty } = require('investira.sdk').validators;
const endpointResponse = require('./endpointResponse');
const { InvalidData } = require('../messages/DataErrors');
const { CreatedMessage } = require('../messages/Success');
const { InternalServerError } = require('../messages/ServerErrors');

const oauth2Token = pSource => {
    /**
     * Retorna token
     *
     * @param {object} req Request HTTP
     * @returns
     */
    const getToken = req => {
        const xType = req.body.grant_type;
        gLog.silly(`oauth2Token middleware ${xType}`);
        if (!isEmpty(req.header('Authorization'))) {
            req.user = req.authInfo;
            //     return abstract.userCredentials(
            //         req.authInfo,
            //         req.body.username,
            //         req.body.password,
            //         req.body.scope || null
            //     );
        }
        if (xType == 'client_credentials') {
            return abstract.clientCredentials(req.user, null);
        } else if (xType == 'password') {
            return abstract.password(
                req.user,
                req.body.username,
                req.body.password,
                req.body.scope || null
            );
        } else if (xType == 'refresh_token') {
            return abstract.refreshToken(
                req.user,
                req.body.refresh_token,
                req.body.scope || null
            );
        } else if (xType == 'autorization_code') {
            //(pClient, pCode, pRedirectURI, pBody, pAuthInfo, pDone)
            return abstract.authorizationCode(req.user, null, null, null, null);
            // } else if (xType == 'user_credentials') {
            //     return abstract.userCredentials(
            //         req.authInfo,
            //         req.body.username,
            //         req.body.password,
            //         req.body.scope || null
            //     );
        } else {
            return Promise.reject(new InvalidData('Invalid grant_type'));
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
                gLog.silly(
                    new InternalServerError(
                        'oauth2Token middleware abstract clientCredentials not implemented'
                    )
                );
                return Promise.reject(new InternalServerError());
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
                gLog.silly(
                    new InternalServerError(
                        'oauth2Token middleware abstract password not implemented'
                    )
                );
                return Promise.reject(new InternalServerError());
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
                gLog.silly(
                    new InternalServerError(
                        'oauth2Token middleware abstract refreshToken not implemented'
                    )
                );
                return Promise.reject(new InternalServerError());
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
                gLog.silly(
                    new InternalServerError(
                        'oauth2 middleware abstract authorizationCode not implemented'
                    )
                );
                return Promise.reject(new InternalServerError());
            },
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
            userCredentials(pClient, pUsername, pPassword, pScope) {
                gLog.error(
                    new InternalServerError(
                        'oauth2Token middleware abstract userCredentials not implemented'
                    )
                );
                return Promise.reject(new InternalServerError());
            }
        },
        pSource
    );

    //Retorna middleware por onde passará os requests.
    return endpointResponse((req, pResolve, pReject) => {
        getToken(req)
            .then(rResult => {
                pResolve({
                    data: { ...rResult, token_type: 'Bearer' },
                    message: new CreatedMessage()
                });
            })
            .catch(rErr => {
                pReject(rErr);
            });
    });
};

//Midware do httpserver para configurar as origens diferentes
module.exports = oauth2Token;
