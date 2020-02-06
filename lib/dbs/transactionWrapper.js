/**
 * Executa função dentro de uma transação e
 * efetua commit ou rollback em caso de acerto ou erro respectivamente
 *
 * @param {object} pCN Conexão com o banco de dados
 * @param {function} pFunction Função a ser executada
 * @param {string} [pSavepoint=null] String com o nome do savepoint a ser utilizado;
 * @returns {Promise}
 */
const transactionWrapper = (pCN, pFunction, pSavepoint = null) => {
    return new Promise((pResolve, pReject) => {
        //Inicia transação
        return pCN
            .startTransaction()
            .then(() => {
                if (pSavepoint) {
                    //Salva savepoint
                    return pCN.setSavepoint(pSavepoint);
                }
            })
            .then(() => {
                //Executa a função
                return pFunction();
            })
            .then(rResult => {
                //Não efetua commit se houver savepoint para dar oportunidade de quem
                //chamou a função efetuar o rollback em caso de erro externos
                if (pSavepoint) {
                    return pResolve(rResult);
                } else {
                    //Commit se função executou sem erro
                    return pCN.commit().then(() => {
                        pResolve(rResult);
                    });
                }
            })
            .catch(rErr => {
                if (pSavepoint) {
                    //Rollback se função executou com erro
                    return (
                        pCN
                            //Rollback até o savepoint
                            .rollbackTo(pSavepoint)
                            .then(() => {
                                //Informa de qualquer forma que houve erro
                                pReject(rErr);
                            })
                            .catch(rErr => {
                                //Informa de qualquer forma que houve erro
                                pReject(rErr);
                            })
                    );
                } else {
                    return (
                        pCN
                            //Rollback integral
                            .rollback()
                            .then(() => {
                                //Informa de qualquer forma que houve erro
                                pReject(rErr);
                            })
                            .catch(rErr => {
                                //Informa de qualquer forma que houve erro
                                pReject(rErr);
                            })
                    );
                }
            })
            .finally(() => {
                if (pSavepoint) {
                    //Liberaa savepoint
                    pCN.releaseSavepoint(pSavepoint);
                }
            });
    });
};

module.exports = transactionWrapper;
