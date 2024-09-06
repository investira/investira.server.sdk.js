const nodemailer = require('nodemailer');
const { ServerErrors } = require('investira.sdk').messages.ServerErrors;
/**
 * Enviar email
 *
 * @param {object} pServerOptions Objeto contendo {host:dominio, port:number, secure:boolean, account:string, password:string}
 */
function emails(pServerOptions) {
    const xOptions = pServerOptions;
    if (!pServerOptions || !pServerOptions.host) {
        // @ts-ignore
        gLog.Error(new ServerErrors('Invalid emailSender options.'));
        return null;
    }
    const { name, host, port, secure, requireTLS, logger, debug, rejectUnauthorized, authMethod, account, password } =
        pServerOptions;

    const xServer = nodemailer.createTransport({
        name: name || 'investira',
        host: host || null,
        port: port || 587,
        secure: secure || false, //pServerOptions.secure || true, port 465
        requireTLS: requireTLS || true,
        logger: logger || false,
        debug: debug || false,
        tls: {
            ciphers: 'SSLv3',
            rejectUnauthorized: rejectUnauthorized || false
        },
        authMethod: authMethod || 'LOGIN', //Mantido enquanto Nodemailer não publicar nova versão com correção
        auth: {
            method: authMethod || 'LOGIN', //Há erro no Nodemailer, que está vefiricando este parametro ao invés do authMethod acima
            user: account || null,
            pass: password || null
        }
    });

    this.options = () => {
        return { xOptions };
    };

    /**
     * Envia mensagem para o a partir do servidor configurado
     *
     * @param {object} pEmail Objeto com as informação{from:string, to:string, subject:string, html:string}
     * @returns {Promise}
     */
    this.send = pEmail => {
        //@ts-ignore
        gLog.verbose(`emailSender send`);
        return new Promise((pResolve, pReject) => {
            return xServer.sendMail(
                {
                    from: pEmail.from, // sender address
                    to: pEmail.to, // list of receivers
                    subject: pEmail.subject, // Subject line
                    html: pEmail.html, // html body
                    cc: pEmail?.cc || null,
                    bcc: pEmail?.bcc || null
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
