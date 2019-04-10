const htmlTemplate = require('../helpers/htmlRender');

//__dirname +
// const xhtmlTemplate = htmlTemplate(
//     '/Users/ricardo.villar/Fnt/Web/JS/investira/src/emails/t_investira_email.ejs',
//     { rmWhitespace: true }
// );
let xEmail = new htmlTemplate();

const xOptions = {};

xEmail
    .compile(
        '/Users/ricardo.villar/Fnt/Web/JS/investira/src/emails/t_email.html',
        xOptions
    )
    .then(() => {
        xEmail
            .render({
                // body:
                //     '/Users/ricardo.villar/Fnt/Web/JS/investira/src/emails/email_confirmar_cadastro.html',
                user: 'ricardo'
            })
            .then(rResult => {
                console.log(rResult);
            })
            .catch(rErr => {
                console.log(`Error ${rErr}`);
            });
    });
// htmlTemplate()
//     .compile(
//         '/Users/ricardo.villar/Fnt/Web/JS/investira/src/emails/t_email.ejs',
//         { rmWhitespace: true }
//     )
//     .then(() => {
//         htmlTemplate.render({
//             body:
//                 '/Users/ricardo.villar/Fnt/Web/JS/investira/src/emails/email_confirmar_cadastro.ejs',
//             user: 'ricardo'
//         });
//     })
//     .catch(rErr => {});

// console.log(xHtml);
