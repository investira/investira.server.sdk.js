const { objectFromPropertyAndValue } = require('investira.sdk').objects;
const { isEmpty } = require('investira.sdk').validators;

const sqls = require('../utils/sqls');
const { ConnectionRequired } = require('investira.sdk').messages.DataErrors;

//1-READ 2-EDIT
//8-READ 8-ADD 16-MODIFY 32-REMOVE}
// TYPE: { READ: 9, ADD: 10, MODIFY: 18, REMOVE: 34, MERGE: 26 },
/** @enum {number} */
const DAO_ACTION_TYPE = Object.freeze({
    READ: 9,
    ADD: 10,
    MODIFY: 18,
    REMOVE: 34,
    MERGE: 26
});

/**
 * Objeto para acesso direto uma única tabela.
 * As regras de edição dos registros deverão ser implementadas no próprio banco e/ou nos métodos:
 * onAdd, onModify, onRemove, onRemoveOne, onRead, onReadOne, onMerge e onValidate.
 * Os edição dos dos registros estará limitada aos atributos definidos em no model(pTableModel).
 * Atributos informados que não façam parte do model serão desprezados, exceto atributos definidos como 'object'
 *
 * @param {string} 	pTableName Nome da tabela que será acessada
 * @param {object} 	pTableModel Objecto com as informações das colunas da tabela.
 *  							Servirá como filtro para evitar manipulação de colunas não previstas.
 * 								Os atributos para definição da coluna são:
 * 								- autoIncrement = Coluna cujo valor é dado automáticamente pelo banco. Só poderá haver uma coluna como autoIncrement.
 * 												Coluna autoincrement já é considerada como generated.
 * 								- generated = Colunas cujos valores são gerados automaticamente NO BANCO. Portanto não farão parte do add(insert) ou do update(modify ou merge).
 * 								- object = true
 * 								- type = Quando for necessário conversão entre o banco e JS.
 * 									      Os tipos válidos são: 'number', 'string', 'date', 'email', 'title' e 'object'.
 * 								ex: {client_id : { autoIncrement:true}, client_name:{}, created:{generated:true}, verified{type:date}}
 * @param {object} [pSource={}] Dao fonte
 * @returns {object} Retorna dao configurado
 */
const dao = (pTableName, pTableModel, pSource = {}) => {
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

            onValidate(_pAction, pDataObject, _pConditions) {
                return Promise.resolve(pDataObject);
            }
        },
        pSource
    );

    return Object.assign(
        abstract,
        Object.freeze({
            DAO_ACTION_TYPE,
            metadata: sqls.createMetadata(pTableName, pTableModel),
            /**
             * Valida os dados
             *
             * @param {object} pTYPE
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
                    abstract
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

            /*
             * ----------------------------------------------------------------------------------
             * READ
             * ----------------------------------------------------------------------------------
             */
            /**
             * Retorna somente um registro, caso exista e null, caso não exista.
             *
             * @param {object} pCN Banco de dados(Schema)
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a consulta.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {Array} pColumns Array com os nomes das colunas a serem retornadas. ex: ["user","name"].
             * 					   Quando não informada ou null, retorna todas as colunas descritas no atributo 'columns' do metadado do Dao.
             * @returns {Promise} com a informação do than
             */
            readOne(pCN, pConditions, pColumns) {
                return new Promise((pResolve, pReject) => {
                    this.read(pCN, pConditions, pColumns, {
                        limit: { size: 1 }
                    })
                        //Sucesso
                        .then(rRow => {
                            //Retorna uma linha
                            if (rRow && rRow.length > 0) {
                                pResolve(rRow[0]);
                                //Retorna null
                            } else {
                                pResolve(null);
                            }
                        })
                        //Error
                        .catch(rErr => {
                            pReject(rErr);
                        });
                });
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
             * @param {number | object} [pClauses={}] {sort, limit:{page, offset, size}} Outras cláusulas da consulta
             * - sort: nomes das colunas e respectiva direção para ordenação
             * - limit:
             * -- page: Página a partir da qual serão lidos a quantidade de registros definida em 'size'.
             *    Deve informar 'size' quando 'page' for informado, ou será considerado como 20 registros por página
             * -- offset: Registro a partir do qual serão lidos a quantidade de registros definida em 'size'.
             *    Caso 'page' tenha sido informado, 'offset' será recalculado em função de 'page' e 'size'.
             * -- size: Quantidade registros a serem lidos. Lê todos quando não especificado.
             * @returns {Promise} com os dados lidos ou null quando não existir
             */
            read(pCN, pConditions, pColumns, pClauses = {}) {
                return new Promise((pResolve, pReject) => {
                    if (isEmpty(pCN)) {
                        return pReject(new ConnectionRequired());
                    }
                    let xRows = [];
                    sqls.getSqlSelect(pCN, this.metadata, pConditions, pColumns, pClauses)
                        .then(rSql => {
                            //Executa Sql
                            return sqls.executeSql(rSql, rRows => {
                                //Loop nas linhas lidas
                                for (let xRow of rRows) {
                                    //Converte o dado lido para JS conforme o metadata
                                    xRow = sqls.convertToJS(this.metadata, xRow);
                                    //Adiciona linha(s) lida ao array
                                    xRows.push(xRow);
                                }
                            });
                        })
                        //Sucesso
                        .then(_rResult => {
                            //Retorna linha lidas
                            pResolve(xRows);
                        })
                        //Erro
                        .catch(rErr => {
                            pReject(rErr);
                        });
                });
            },

            /*
             * ----------------------------------------------------------------------------------
             * ADD
             * ----------------------------------------------------------------------------------
             */
            /**
             * Insere registro
             *
             * @param {object} pCN Banco de dados(Schema)
             * @param {object} pDataObject Objeto com os valores a serem inseridos.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @returns {Promise} com os dados incluídos, inclusive com a autoincremento/sequence, se existir
             */
            add(pCN, pDataObject) {
                return new Promise((pResolve, pReject) => {
                    // let xLogInfo = {};
                    let xDataObject = {};
                    //Valida os dados e recebe novo objeto com os dados já validados
                    this.validate(DAO_ACTION_TYPE.ADD, pDataObject, null)
                        .then(rDataObject => {
                            if (isEmpty(pCN)) {
                                return pReject(new ConnectionRequired());
                            }
                            //Salva dados já validados
                            xDataObject = rDataObject;
                            return sqls.getSqlInsert(pCN, this.metadata, rDataObject);
                        })
                        .then(rSql => {
                            //Executa Sql
                            return sqls.executeSql(rSql);
                        })
                        //Sucesso
                        .then(rResult => {
                            //Se foi gerado um valor de autoincrement/sequence e houver a informação no DAO do nome da coluna
                            //inclui a coluna e respectivo valor como retorno da função
                            if (
                                rResult.getAutoIncrementValue() > 0 &&
                                !isEmpty(this.metadata.autoIncrementColumnName)
                            ) {
                                //Inclui a coluna de autoincrement/sequence aos dados de retorno
                                Object.assign(
                                    xDataObject,
                                    objectFromPropertyAndValue(
                                        this.metadata.autoIncrementColumnName,
                                        rResult.getAutoIncrementValue()
                                    )
                                );
                            }
                            pResolve(xDataObject);
                        })
                        //Erro
                        .catch(rErr => {
                            pReject(rErr);
                        });
                });
            },

            /*
             * ----------------------------------------------------------------------------------
             * REMOVE
             * ----------------------------------------------------------------------------------
             */
            /**
             * Exclui somente um registro, caso exista
             *
             * @param {object} pCN Banco de dados(Schema)
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a exclusão.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @returns {Promise} com a quantidade de registro excluídos
             */
            removeOne(pCN, pConditions) {
                return this.remove(pCN, pConditions, 1);
            },

            /**
             * Exclui os registro conforme a os valores de pConditions
             *
             * @param {object} pCN Banco de dados(Schema)
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a exclusão.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {number} [pLimit] Quantidade registros a serem excluídos. Exclui todos quando não especificado.
             * @returns {Promise} com a quantidade de registro excluídos
             */
            remove(pCN, pConditions, pLimit) {
                return new Promise((pResolve, pReject) => {
                    //Valida os dados e recebe novo objeto com os dados já validados
                    this.validate(DAO_ACTION_TYPE.REMOVE, null, pConditions)
                        .then(() => {
                            if (isEmpty(pCN)) {
                                return pReject(new ConnectionRequired());
                            }
                            return sqls.getSqlDelete(pCN, this.metadata, pConditions, pLimit);
                        })
                        .then(rSql => {
                            //Executa Sql
                            return sqls.executeSql(rSql);
                        })
                        //Sucesso
                        .then(rResult => {
                            pResolve({
                                record_count: rResult.getAffectedRowsCount()
                            });
                        })
                        //Erro
                        .catch(rErr => {
                            pReject(rErr);
                        });
                });
            },

            /*
             * ----------------------------------------------------------------------------------
             * MODIFY
             * ----------------------------------------------------------------------------------
             */
            /**
             * Atualiza dos dados utilizando
             *
             * @param {object} pCN Banco de dados(Schema)
             * @param {object} pDataObject Objeto com os valores a serem atulizados.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {object} pConditions Objeto com as condições para a atualização.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {number} [pLimit] Quantidade registros a serem atulizados. Atualiza todos quando não especificado.
             * @returns {Promise} com os dados alterados ou null se nehum registro foi encontrado para edição
             */
            modify(pCN, pDataObject, pConditions, pLimit) {
                return new Promise((pResolve, pReject) => {
                    let xDataObject = {};
                    //Valida os dados e recebe novo objeto com os dados já validados
                    this.validate(DAO_ACTION_TYPE.MODIFY, pDataObject, pConditions)
                        .then(rDataObject => {
                            if (isEmpty(pCN)) {
                                return pReject(new ConnectionRequired());
                            }
                            //Salva dados já validados
                            xDataObject = rDataObject;
                            return sqls.getSqlUpdate(pCN, this.metadata, rDataObject, pConditions, pLimit);
                        })
                        .then(rSql => {
                            //Executa Sql
                            return sqls.executeSql(rSql);
                        })
                        //Sucesso
                        .then(rResult => {
                            if (rResult.getAffectedRowsCount() > 0) {
                                //Se houve edição, retorna objetos editados
                                pResolve(xDataObject);
                            } else {
                                //Se não houver edição, retorna null
                                pResolve(null);
                            }
                        })
                        //Erro
                        .catch(rErr => {
                            pReject(rErr);
                        });
                });
            },

            /*
             * ----------------------------------------------------------------------------------
             * MERGE
             * ----------------------------------------------------------------------------------
             */
            /**
             * Merge registro. Altera se existir. Inclui se não existir.
             *
             * @param {object} pCN Banco de dados(Schema)
             * @param {object} pDataObject Objeto com os valores a serem atulizados.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {object} pConditions Objeto com as condições para a atualização.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {number} [pLimit] Quantidade registros a serem atualizados. Atualiza todos quando não especificado.
             * @returns {Promise} com os dados alterados/incluídos
             */
            merge(pCN, pDataObject, pConditions, pLimit) {
                return new Promise((pResolve, pReject) => {
                    //Valida os dados e recebe novo objeto com os dados já validados
                    this.validate(DAO_ACTION_TYPE.MODIFY, pDataObject, pConditions)
                        .then(rDataObject => {
                            return this.modify(pCN, rDataObject, pConditions, pLimit);
                        })
                        .then(rRow => {
                            if (!rRow) {
                                //Inclusão de novo registro
                                return this.add(pCN, pDataObject);
                            } else {
                                //Sucesso - Registro já existente foi alterado
                                return Promise.resolve(rRow);
                            }
                        })
                        //Sucesso
                        .then(rRow => {
                            pResolve(rRow);
                        })
                        //Erro
                        .catch(rErr => {
                            pReject(rErr);
                        });
                });
            }
        })
    );
};

module.exports = dao;

module.exports.DAO_ACTION_TYPE = DAO_ACTION_TYPE;
