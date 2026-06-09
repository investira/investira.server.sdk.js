const nodemailer = require('nodemailer');
//@ts-ignore
const { ServerErrors } = require('investira.sdk').messages.ServerErrors;

const DEFAULT_SENDER_NAME = 'investira';
const DEFAULT_PORT = 587;
const DEFAULT_AUTH_METHOD = 'LOGIN';

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
        name: name || DEFAULT_SENDER_NAME,
        host: host || null,
        port: port || DEFAULT_PORT,
        secure: secure || false, //pServerOptions.secure || true, port 465
        requireTLS: requireTLS || true,
        logger: logger || false,
        debug: debug || false,
        tls: {
            ciphers: 'SSLv3',
            rejectUnauthorized: rejectUnauthorized || false
        },
        authMethod: authMethod || DEFAULT_AUTH_METHOD, //Mantido enquanto Nodemailer não publicar nova versão com correção
        auth: {
            method: authMethod || DEFAULT_AUTH_METHOD, //Há erro no Nodemailer, que está vefiricando este parametro ao invés do authMethod acima
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
     * @param {object} pEmail Objeto com as informação{from:string, to:string, subject:string, html:string, replyTo:string, reply_to:string, attachments:array}
     * @returns {Promise}
     */
    this.send = pEmail => {
        //@ts-ignore
        gLog.verbose(`emailSender send`);
        const xPayload = pvBuildSendMailPayload(pEmail);
        return new Promise((pResolve, pReject) => {
            return xServer.sendMail(xPayload, (rErr, rInfo) => {
                if (!rErr) {
                    pResolve(pvBuildSendSuccessResult(rInfo));
                } else {
                    pReject(rErr);
                }
            });
        });
    };
}

module.exports = emails;

/**
 * Monta o payload final aceito pelo Nodemailer.
 *
 * @param {object} pEmail Objeto da mensagem a ser enviada
 * @returns {object}
 */
function pvBuildSendMailPayload(pEmail) {
    return {
        from: pEmail.from, // Remetente
        to: pEmail.to, // Destinatários principais
        subject: pEmail.subject, // Assunto
        html: pEmail.html || pEmail.text, // Corpo HTML
        cc: pEmail?.cc || null, // Destinatários em cópia
        bcc: pEmail?.bcc || null, // Destinatários em cópia oculta
        replyTo: pEmail?.reply_to || pEmail?.replyTo || null, // Endereço de resposta com fallback legado
        attachments: pEmail?.attachments || null // Anexos e imagens inline com cid
    };
}


/**
 * Normaliza o retorno de sucesso do provedor.
 *
 * @param {object} pInfo Retorno de sucesso do Nodemailer
 * @returns {object}
 */
function pvBuildSendSuccessResult(pInfo) {
    const xInfo = pInfo || null;

    return {
        info: xInfo,
        messageId: xInfo && xInfo.messageId ? xInfo.messageId : null
    };
}
