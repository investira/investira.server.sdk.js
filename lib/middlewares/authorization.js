const { BadRequestError } = require('investira.sdk').messages.ClientErrors;
const endpointResponse = require('../middlewares/endpointResponse');

/**
 * Middleware para recuperar os dados 'authorization' do request
 * @returns função
 */
const authorization = pCallback => {
    return endpointResponse((req, _pResolve, pReject, pNext) => {
        req.authInfo = {};
        if (req.headers && req.headers.authorization) {
            let xParts = req.headers.authorization.split(' ');
            if (xParts.length == 2) {
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
                        return pReject(
                            new BadRequestError(
                                'Username Or Password Not Provided'
                            )
                        );
                    }

                    if (!xCredential[0] || !xCredential[1]) {
                        return pReject(
                            new BadRequestError(
                                'Username Or Password Not Provided'
                            )
                        );
                    }
                    req.authInfo.username = xCredential[0];
                    req.authInfo.password = xCredential[1];
                }
            } else {
                return pReject(new BadRequestError('Credential Required'));
            }
            pCallback(req.authInfo, pErr => {
                if (!pErr) {
                    pNext();
                } else {
                    return pReject(pErr);
                }
            });
        } else {
            pReject(new BadRequestError('Credential Required'));
        }
    });
};

module.exports = authorization;
