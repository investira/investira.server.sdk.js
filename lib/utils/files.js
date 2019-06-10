const path = require('path');

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
    }
};
module.exports = files;
