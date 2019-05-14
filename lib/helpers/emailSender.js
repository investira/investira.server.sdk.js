const nodemailer = require('nodemailer');
/**
 * Enviar email
 *
 * @param {object} pServerOptions Objeto contendo {host:dominio, port:number, secure:boolean, account:string, password:string}
 */
function emails(pServerOptions) {
    const xOptions = pServerOptions;
    const xServer = nodemailer.createTransport({
        name: pServerOptions.name || 'investira',
        host: pServerOptions.host,
        port: 587, //pServerOptions.port || 587,
        secure: pServerOptions.secure || false, //pServerOptions.secure || true, port 465
        requireTLS: pServerOptions.requireTLS || true,
        logger: true,
        debug: false,
        tls: {
            ciphers: 'SSLv3',
            rejectUnauthorized: pServerOptions.rejectUnauthorized || false
        },
        authMethod: pServerOptions.authMethod || 'LOGIN', //Mantido enquanto Nodemailer não publicar nova versão com correção
        auth: {
            method: pServerOptions.authMethod || 'LOGIN', //Há erro no Nodemailer, que está vefiricando este parametro ao invés do authMethod acima
            user: pServerOptions.account,
            pass: pServerOptions.password
        }
    });

    this.options = () => {
        return { xOptions };
    };

    /**
     * Envia mensagem para o a partir do servidor configurado
     *
     * @param {object} pEmail Objeto com as informação{from:string, to:string, subject:string, html:string}
     * @returns Promise
     */
    this.send = pEmail => {
        gLog.debug(`emailSender send`);
        return new Promise((pResolve, pReject) => {
            return xServer.sendMail(
                {
                    from: pEmail.from, // sender address
                    to: pEmail.to, // list of receivers
                    subject: pEmail.subject, // Subject line
                    html: pEmail.html // html body
                },
                rErr => {
                    if (!rErr) {
                        pResolve();
                    } else {
                        pReject(rErr);
                    }
                }
            );
        });
    };
}

module.exports = emails;
