const httpCors = pSource => {
    return Object.assign((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header(
            "Access-Control-Allow-Methods",
            "GET, POST, OPTIONS, PUT, DELETE"
        );
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, X-Requested-With, Content-Type, Accept"
        );
        pSource(req, res, next);
    });
};

//Midware do httpserver para configurar as origens diferentes
module.exports = httpCors;
