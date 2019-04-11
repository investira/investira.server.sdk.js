const nodemailer = require('nodemailer');

/**
 * Envia email
 *
 * @param {object} pServerOptions Objeto contendo {host:dominio, port:number, secure:boolean, account:string, password:string}
 */
function emails(pServerOptions) {
    const xServer = nodemailer.createTransport({
        host: pServerOptions.host,
        port: pServerOptions.port || 587,
        secure: pServerOptions.secure || false, // true for 465, false for other ports
        auth: {
            user: pServerOptions.account, //pOptions.account, // generated ethereal user
            pass: pServerOptions.password //pOptions.password // generated ethereal password
        },
        requireTLS: true, //Force TLS
        tls: {
            rejectUnauthorized: false
        }
    });

    this.options = pServerOptions;
    /**
     * Envia mensagem para o a partir do servidor configurado
     *
     * @param {object} pEmail Objeto com as informação{from:string, to:string, subject:string, html:string}
     * @returns Promise
     */
    this.send = pEmail => {
        // return new Promise((pResolve, pReject) => {
        return xServer.sendMail({
            from: pEmail.from, // sender address
            to: pEmail.to, // list of receivers
            subject: pEmail.subject, // Subject line
            html: pEmail.html // html body
        });
        // }).catch(rErr => {});
    };
    // return Object.freeze({
    //     options: xServerOptions,
    //     /**
    //      * Envia email
    //      *
    //      * @param {object} pEmail {from, to, subject, text, html}
    //      * @returns
    //      */
    //     send: pEmail => {
    //         return xServer.sendMail({
    //             from: pEmail.from, // sender address
    //             to: pEmail.to, // list of receivers
    //             subject: pEmail.subject, // Subject line
    //             html: pEmail.html // html body
    //         });
    //     }
    // });
}

module.exports = emails;
