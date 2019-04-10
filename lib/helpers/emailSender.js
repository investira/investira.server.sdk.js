const nodemailer = require('nodemailer');

const emails = pServerOptions => {
    const xServerOptions = pServerOptions;
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
    return Object.freeze({
        options: xServerOptions,
        /**
         * Envia email
         *
         * @param {object} pEmail {from, to, subject, text, html}
         * @returns
         */
        send: pEmail => {
            return xServer.sendMail({
                from: pEmail.from, // sender address
                to: pEmail.to, // list of receivers
                subject: pEmail.subject, // Subject line
                html: pEmail.html // html body
            });
        }
    });
};

module.exports = emails;
