// @ts-ignore
const { NotImplementedError } = require('investira.sdk').messages.ServerErrors;

//1-READ 2-EDIT
//8-READ 8-ADD 16-MODIFY 32-REMOVE}
// TYPE: { READ: 9, ADD: 10, MODIFY: 18, REMOVE: 34, MERGE: 26 },
/** @enum {number} */
const CRUD_ACTION_TYPE = Object.freeze({
    READ: 9,
    ADD: 10,
    MODIFY: 18,
    REMOVE: 34,
    MERGE: 26
});

/**
 * Objeto para manipulação de dados, podendo se de um único dao ou de vários.
 * As regras de negócio para deverão ser implementadas nos métodos:
 * onAdd, onModify, onRemove, onRemoveOne, onRead, onReadOne, onMerge e onValidate.
 *
 * @param {object} [pSource={}]
 * @returns
 */
const crud = (pSource = {}) => {
    const abstract = Object.assign(
        {
            /**
             * Método abstract chamado na validação
             * Para a efetiva validação, deve-se implementar este método no objeto pSource
             *
             * @param {object} pAction Ação que está sendo validada conténdo {TYPE:tipo de ação, isEditin:se é uma edição de qualquer tipo, isRemoving:se é uma exclusão}
             * @param {object} pDataObject Objeto com os valores a serem inseridos.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a consulta.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @returns {Promise}
             */
            //@ts-ignore
            onValidate(pAction, pDataObject, pConditions) {
                return Promise.resolve(pDataObject);
            },
            /**
             * Retorna somente um registro, caso exista e null, caso não exista.
             *
             * @param {object} pCN Banco de dados(Schema)
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a consulta.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {Array} pColumns Array com os nomes das colunas a serem retornadas. ex: ["user","name"].
             * 					   	- Quando não informada ou null, retorna todas as colunas descritas no atributo 'columns' do metadado do Dao.
             * 						- Quando informada como array vazio [], retorna quantidade de registros da pesquisa.
             * @param {number | object} [pClauses={}] {sort, group, limit:{page, offset, size}} Outras cláusulas da consulta
             * - sort: nomes das colunas e respectiva direção para ordenação
             * - group: nome das colunas que serão agrupada.
             * - limit:
             * -- page: Página a partir da qual serão lidos a quantidade de registros definida em 'size'.
             *    Deve informar 'size' quando 'page' for informado, ou será considerado como 20 registros por página
             * -- offset: Registro a partir do qual serão lidos a quantidade de registros definida em 'size'.
             *    Caso 'page' tenha sido informado, 'offset' será recalculado em função de 'page' e 'size'.
             * -- size: Quantidade registros a serem lidos. Lê todos quando não especificado.
             * @returns {Promise} com a informação
             */
            //@ts-ignore
            onReadOne(pCN, pConditions, pColumns) {
                return Promise.reject(new NotImplementedError('crud readOne not implemented'));
            },

            /**
             * Retorna os registros conforme o objeto pConditions
             *
             * @param {object} pCN Banco de dados(Schema)
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a consulta.
             * 						       Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						       ex: {client_id: 2, client_name: "teste"}
             * @param {Array} pColumns Array com os nomes das colunas a serem retornadas. ex: ["user","name"]
             * 					       Quando não informada ou null, retorna todas as colunas descritas no atributo 'columns' do metadado do Dao.
             * @param {number | object} [pClauses={}] {sort, group, limit:{page, offset, size}} Outras cláusulas da consulta
             * - sort: nomes das colunas e respectiva direção para ordenação
             * - limit:
             * -- page: Página a partir da qual serão lidos a quantidade de registros definida em 'size'.
             *    Deve informar 'size' quando 'page' for informado, ou será considerado como 20 registros por página
             * -- offset: Registro a partir do qual serão lidos a quantidade de registros definida em 'size'.
             *    Caso 'page' tenha sido informado, 'offset' será recalculado em função de 'page' e 'size'.
             * -- size: Quantidade registros a serem lidos. Lê todos quando não especificado.
             * @returns {Promise}
             */
            //@ts-ignore
            onRead(pCN, pConditions, pColumns, pClauses) {
                return Promise.reject(new NotImplementedError('crud read not implemented'));
            },
            //@ts-ignore
            onAdd(pCN, pDataObject) {
                return Promise.reject(new NotImplementedError('acrud add not implemented'));
            },
            //@ts-ignore
            onRemoveOne(pCN, pConditions) {
                return Promise.reject(new NotImplementedError('crud removeOne not implemented'));
            },
            //@ts-ignore
            onRemove(pCN, pConditions, pClauses) {
                return Promise.reject(new NotImplementedError('rcrud remove not implemented'));
            },
            //@ts-ignore
            onModify(pCN, pDataObject, pConditions, pClauses) {
                return Promise.reject(new NotImplementedError('crud modify not implementedd'));
            },
            //@ts-ignore
            onModifyOne(pCN, pDataObject, pConditions, pCurrentDataObject = {}) {
                return Promise.reject(new NotImplementedError('crud modifyOne not implementedd'));
            },
            //@ts-ignore
            onMerge(pCN, pDataObject, pConditions, pClauses) {
                return Promise.reject(new NotImplementedError('crud merge not implemented'));
            }
        },
        pSource
    );
    return Object.assign(
        abstract,
        Object.freeze({
            /**
             * Valida os dados
             *
             * @param {*} pTYPE
             * @param {object} pDataObject
             * @param {object} pConditions
             * @returns {Promise} com os novos dados já validados
             */
            validate(pTYPE, pDataObject, pConditions = null) {
                return new Promise((pResolve, pReject) => {
                    let pAction = {
                        TYPE: pTYPE,
                        isEditing: (2 & pTYPE) == 2,
                        isRemoving: (32 & pTYPE) == 32
                    };
                    return abstract
                        .onValidate(pAction, pDataObject, pConditions)
                        .then(rResult => {
                            pResolve(rResult);
                        })
                        .catch(rErr => {
                            // @ts-ignore
                            gLog.error(rErr);
                            pReject(rErr);
                        });
                });
            },
            /**
             * Retorna somente um registro, caso exista e null, caso não exista.
             *
             * @param {object} pCN Banco de dados(Schema)
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a consulta.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {array} pColumns Array com os nomes das colunas a serem retornadas. ex: ["user","name"].
             * 					   Quando não informada ou null, retorna todas as colunas descritas no atributo 'columns' do metadado do Dao.
             * @returns {Promise} com a informação do than
             */
            readOne(pCN, pConditions, pColumns) {
                try {
                    return abstract.onReadOne(pCN, pConditions, pColumns);
                } catch (pErr) {
                    // @ts-ignore
                    gLog.error(pErr);
                    return Promise.reject(pErr);
                }
            },
            /**
             * Retorna os registros conforme o objeto pConditions
             *
             * @param {object} pCN Banco de dados(Schema)
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a consulta.
             * 						       Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						       ex: {client_id: 2, client_name: "teste"}
             * @param {array} pColumns Array com os nomes das colunas a serem retornadas. ex: ["user","name"]
             * 					       Quando não informada ou null, retorna todas as colunas descritas no atributo 'columns' do metadado do Dao.
             * @param {number | object} [pClauses={}] {sort, group, limit:{page, offset, size}} Outras cláusulas da consulta
             * - sort: nomes das colunas e respectiva direção para ordenação
             * - group: nome das colunas que serão agrupada.
             * - limit:
             * -- page: Página a partir da qual serão lidos a quantidade de registros definida em 'size'.
             *    Deve informar 'size' quando 'page' for informado, ou será considerado como 20 registros por página
             * -- offset: Registro a partir do qual serão lidos a quantidade de registros definida em 'size'.
             *    Caso 'page' tenha sido informado, 'offset' será recalculado em função de 'page' e 'size'.
             * -- size: Quantidade registros a serem lidos. Lê todos quando não especificado.
             * @returns {Promise} com os dados lidos ou null quando não existir
             */
            read(pCN, pConditions, pColumns, pClauses = {}) {
                try {
                    return abstract.onRead(pCN, pConditions, pColumns, pClauses);
                } catch (pErr) {
                    // @ts-ignore
                    gLog.error(pErr);
                    return Promise.reject(pErr);
                }
            },
            /**
             * Inserir registro
             *
             * @param {object} pCN Banco de dados(Schema)
             * @param {object} pDataObject Objeto com os valores a serem inseridos.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {boolean} [pIgnoreDuplicated=false] Indica se ignora se ocorrer chave duplicada
             * @returns {Promise} com os dados incluídos, inclusive com a autoincremento/sequence, se existir
             */
            add(pCN, pDataObject, pIgnoreDuplicated = false) {
                try {
                    //Valida os dados e recebe novo objeto com os dados já validados
                    return this.validate(CRUD_ACTION_TYPE.ADD, pDataObject, null).then(rDataObject => {
                        return abstract.onAdd(pCN, rDataObject, pIgnoreDuplicated);
                    });
                } catch (pErr) {
                    // @ts-ignore
                    gLog.error(pErr);
                    return Promise.reject(pErr);
                }
            },
            /**
             * Excluir somente um registro, caso exista
             *
             * @param {object} pCN Banco de dados(Schema)
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a exclusão.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @returns {Promise} com a quantidade de registro excluídos
             */
            removeOne(pCN, pConditions) {
                try {
                    //Valida os dados e recebe novo objeto com os dados já validados
                    return this.validate(CRUD_ACTION_TYPE.REMOVE, null, pConditions).then(() => {
                        return abstract.onRemoveOne(pCN, pConditions);
                    });
                } catch (pErr) {
                    // @ts-ignore
                    gLog.error(pErr);
                    return Promise.reject(pErr);
                }
            },
            /**
             * Excluir os registro conforme a os valores de pConditions
             *
             * @param {object} pCN Banco de dados(Schema)
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a exclusão.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {number | object} [pClauses={}] {sort, group, limit:{page, offset, size}} Outras cláusulas da consulta
             * - sort: nomes das colunas e respectiva direção para ordenação
             * - group: nome das colunas que serão agrupada.
             * - limit:
             * -- page: Página a partir da qual serão lidos a quantidade de registros definida em 'size'.
             *    Deve informar 'size' quando 'page' for informado, ou será considerado como 20 registros por página
             * -- offset: Registro a partir do qual serão lidos a quantidade de registros definida em 'size'.
             *    Caso 'page' tenha sido informado, 'offset' será recalculado em função de 'page' e 'size'.
             * -- size: Quantidade registros a serem lidos. Lê todos quando não especificado.
             * @returns {Promise} com a quantidade de registro excluídos
             */
            remove(pCN, pConditions, pClauses = {}) {
                try {
                    //Valida os dados e recebe novo objeto com os dados já validados
                    return this.validate(CRUD_ACTION_TYPE.REMOVE, null, pConditions).then(() => {
                        return abstract.onRemove(pCN, pConditions, pClauses);
                    });
                } catch (pErr) {
                    // @ts-ignore
                    gLog.error(pErr);
                    return Promise.reject(pErr);
                }
            },
            /**
             * Atualizar dos dados utilizando
             *
             * @param {object} pCN Banco de dados(Schema)
             * @param {object} pDataObject Objeto com os valores a serem atualizados.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {object} pConditions Objeto com as condições para a atualização.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {number | object} [pClauses={}] {sort, group, limit:{page, offset, size}} Outras cláusulas da consulta
             * - sort: nomes das colunas e respectiva direção para ordenação
             * - group: nome das colunas que serão agrupada.
             * - limit:
             * -- page: Página a partir da qual serão lidos a quantidade de registros definida em 'size'.
             *    Deve informar 'size' quando 'page' for informado, ou será considerado como 20 registros por página
             * -- offset: Registro a partir do qual serão lidos a quantidade de registros definida em 'size'.
             *    Caso 'page' tenha sido informado, 'offset' será recalculado em função de 'page' e 'size'.
             * -- size: Quantidade registros a serem lidos. Lê todos quando não especificado.
             * @returns {Promise} com os dados alterados ou null se nehum registro foi encontrado para edição
             */
            modify(pCN, pDataObject, pConditions, pClauses = {}) {
                try {
                    //Valida os dados e recebe novo objeto com os dados já validados
                    return this.validate(CRUD_ACTION_TYPE.MODIFY, pDataObject, pConditions).then(rDataObject => {
                        return abstract.onModify(pCN, rDataObject, pConditions, pClauses);
                    });
                } catch (pErr) {
                    // @ts-ignore
                    gLog.error(pErr);
                    return Promise.reject(pErr);
                }
            },
            /**
             * Merge registro. Altera se existir. Inclui se não existir.
             *
             * @param {object} pCN Banco de dados(Schema)
             * @param {object} pDataObject Objeto com os valores a serem atualizados.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {object} pConditions Objeto com as condições para a atualização.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {number | object} [pClauses={}] {sort, group, limit:{page, offset, size}} Outras cláusulas da consulta
             * - sort: nomes das colunas e respectiva direção para ordenação
             * - group: nome das colunas que serão agrupada.
             * - limit:
             * -- page: Página a partir da qual serão lidos a quantidade de registros definida em 'size'.
             *    Deve informar 'size' quando 'page' for informado, ou será considerado como 20 registros por página
             * -- offset: Registro a partir do qual serão lidos a quantidade de registros definida em 'size'.
             *    Caso 'page' tenha sido informado, 'offset' será recalculado em função de 'page' e 'size'.
             * -- size: Quantidade registros a serem lidos. Lê todos quando não especificado.
             * @returns {Promise} com os dados alterados/incluídos
             */
            merge(pCN, pDataObject, pConditions, pClauses = {}) {
                try {
                    //Valida os dados e recebe novo objeto com os dados já validados
                    return this.validate(CRUD_ACTION_TYPE.MERGE, pDataObject, pConditions).then(rDataObject => {
                        return abstract.onMerge(pCN, rDataObject, pConditions, pClauses);
                    });
                } catch (pErr) {
                    // @ts-ignore
                    gLog.error(pErr);
                    return Promise.reject(pErr);
                }
            },
            /**
             * Atualizar dos dados utilizando
             *
             * @param {object} pCN Banco de dados(Schema)
             * @param {object} pDataObject Objeto com os valores a serem atualizados.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {object} pConditions Objeto com as condições para a atualização.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {object} [pOptions=null] { currentDataObject, onDiff}
             *  - currentDataObject: Objeto com dados atuais
             *  - onDiff : Função que será chamada, caso haja diferença, contendo dados da diferença.
             * @returns {Promise} com os dados alterados ou null se nehum registro foi encontrado para edição
             */
            modifyOne(pCN, pDataObject, pConditions, pOptions = null) {
                try {
                    //Valida os dados e recebe novo objeto com os dados já validados
                    return this.validate(CRUD_ACTION_TYPE.MODIFY, pDataObject, pConditions).then(rDataObject => {
                        return abstract.onModifyOne(pCN, rDataObject, pConditions, pOptions);
                    });
                } catch (pErr) {
                    // @ts-ignore
                    gLog.error(pErr);
                    return Promise.reject(pErr);
                }
            }
        })
    );
};

module.exports = crud;

module.exports.CRUD_ACTION_TYPE = CRUD_ACTION_TYPE;
