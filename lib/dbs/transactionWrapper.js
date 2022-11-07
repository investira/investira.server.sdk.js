const { setSavepoint, rollbackTo } = require('../utils/sqls');
/**
 * Executa função dentro de uma transação e
 * efetua commit ou rollback em caso de acerto ou erro respectivamente
 *
 * @param {object} pCN Conexão com o banco de dados
 * @param {function} pPromise Promise a ser executada
 * @param {string} [pSavepoint=null] String com o nome do savepoint a ser utilizado;
 * @returns {Promise}
 */
const transactionWrapper = (pCN, pPromise, pSavepoint = null) => {
    return new Promise((pResolve, pReject) => {
        //Inicia transação
        return pCN
            .startTransaction()
            .then(() => {
                if (pSavepoint) {
                    //Salva savepoint
                    return setSavepoint(pCN, pSavepoint);
                }
                return Promise.resolve();
            })
            .then(() => {
                //Executa a função
                return pPromise();
            })
            .then(rResult => {
                //Não efetua commit se houver savepoint para dar oportunidade
                //para quem chamou a função, efetuar o rollback em caso de erro externo
                if (pSavepoint) {
                    //Commit se função executou sem erro
                    return pCN.commit().then(() => {
                        pResolve(rResult);
                    });
                } else {
                    pResolve(rResult);
                }
            })
            .catch(rErr => {
                if (pSavepoint) {
                    //Rollback se função executou com erro
                    return rollbackTo(pCN, pSavepoint)
                        .then(() => {
                            pReject(rErr);
                        })
                        .catch(rErr => {
                            pReject(rErr);
                        });
                } else {
                    //Rollback integral
                    return pCN.rollback().finally(() => {
                        //Informa de qualquer forma que houve erro
                        pReject(rErr);
                    });
                }
            });
    });
};

module.exports = transactionWrapper;
