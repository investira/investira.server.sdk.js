const nodemailer = require('nodemailer');
//@ts-ignore
const { ServerErrors } = require('investira.sdk').messages.ServerErrors;

const DEFAULT_SENDER_NAME = 'investira';
const DEFAULT_PORT = 587;
const DEFAULT_AUTH_METHOD = 'LOGIN';
const REGEX_CRLF = /[\r\n]+/g;

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
        name: pvSanitizeTransportName(name || DEFAULT_SENDER_NAME),
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
    const xEmail = pEmail && typeof pEmail === 'object' && !Array.isArray(pEmail) ? pEmail : {};
    const xReplyTo = pvNormalizeAddressField(xEmail.replyTo || xEmail.reply_to);

    return {
        from: pvNormalizeAddressField(xEmail.from), // Remetente
        to: pvNormalizeAddressField(xEmail.to), // Destinatários principais
        subject: xEmail.subject, // Assunto
        html: xEmail.html || xEmail.text, // Corpo HTML
        cc: pvNormalizeAddressField(xEmail.cc), // Destinatários em cópia
        bcc: pvNormalizeAddressField(xEmail.bcc), // Destinatários em cópia oculta
        replyTo: xReplyTo || null, // Endereço de resposta com fallback legado
        attachments: xEmail.attachments || null // Anexos e imagens inline com cid
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

/**
 * Normaliza campos de endereco para reduzir risco de injecao por quebra de linha.
 *
 * @param {string|Array|object} pAddress Campo de endereco informado pelo consumidor
 * @returns {string|Array|object|null}
 */
function pvNormalizeAddressField(pAddress) {
    if (Array.isArray(pAddress)) {
        return pAddress.map(pItem => {
            return pvNormalizeAddressField(pItem);
        });
    }

    if (typeof pAddress === 'string') {
        return pAddress.replace(REGEX_CRLF, ' ').trim();
    }

    if (!pAddress || typeof pAddress !== 'object') {
        return pAddress || null;
    }

    return pAddress;
}

/**
 * Normaliza o nome do transporte SMTP para evitar injecao no EHLO/HELO.
 *
 * @param {string} pName Nome configurado para o transporte
 * @returns {string}
 */
function pvSanitizeTransportName(pName) {
    if (typeof pName !== 'string' || !pName.trim()) {
        return DEFAULT_SENDER_NAME;
    }

    return pName.replace(REGEX_CRLF, '').trim();
}
