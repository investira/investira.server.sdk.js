const path = require('path');
const fs = require('fs');
const { httpRequests } = require('investira.sdk');

const files = {
    /**
     * Retorna o caminho completo do projeto
     *
     * @returns
     */
    projectPath: () => {
        return process.cwd();
    },

    /**
     * Retorna o caracter separador de pastas. ex: /
     *
     * @returns
     */
    sep: () => {
        return path.sep;
    },

    download: (pUrl, pLocalPath, pOnDownloadProgress = () => {}) => {
        return httpRequests
            .requestGET(
                {
                    url: pUrl,
                    responseType: 'arraybuffer',
                    // onDownloadProgress: pOnDownloadProgress,
                    headers: {
                        Cookie: 'security=true'
                        //             // Connection: 'keep-alive',
                        //             // Pragma: 'no-cache',
                        //             // 'Cache-Control': 'no-cache',
                        //             // 'Upgrade-Insecure-Requests': '1',
                        //             // 'User-Agent': 'iphone',
                        //             // DNT: '1',
                        //             // Accept:
                        //             //     'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                        //             // 'Accept-Encoding': 'gzip, deflate',
                        //             // 'Accept-Language': 'en-US,en;q=0.9,pt;q=0.8'
                    }
                },
                true
            )
            .then(result => {
                const outputFilename = pLocalPath + '/file.zip';
                console.log(outputFilename);
                fs.writeFileSync(outputFilename, result.data);
                // const outputFilename =
                //     path.normalize(pLocalPath) +
                //     files.sep() +
                //     path.basename(result.request.path);
                // console.log(outputFilename);
                // fs.writeFileSync(outputFilename, result.data);
            })
            .catch(rErr => {
                gLog.error(rErr);
            });
    }
};
module.exports = files;
