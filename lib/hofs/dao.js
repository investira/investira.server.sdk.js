const sqls = require('../utils/sqls');
const { objectFromPropertyAndValue } = require('investira.sdk').objects;
const { isEmpty } = require('investira.sdk').validators;
// const { InvalidData } = require('../messages/DataErrors');
const { SQLErrorResolver } = require('../messages/DataErrors');
/**
 * Objecto para acesso direto uma única tabela.
 * As regras de edição dos registros deverão ser implementadas no próprio banco e/ou nos métodos:
 * onAdd, onModify, onRemove, onRemoveOne, onRead, onReadOne, onMerge e onValidate.
 *
 * @param {object} 	pSource Dao fonte
 * @param {string} 	pTableName Nome da tabela que será acessada
 * @param {object} 	pTableModel Objecto com as informações das colunas da tabela.
 *  							Servirá como filtro para evitar manipulação de colunas não previstas.
 * 								Os atributos para definição da coluna são:
 * 								autoIncrement = Coluna cujo valor é dado automáticamente pelo banco. Só poderá haver uma coluna como autoIncrement.
 * 												Coluna autoincrement já é considerada como generated.
 * 								generated = Colunas cujos valores são gerados automaticamente NO BANCO. Portanto não farão parte do add(insert) ou do update(modify ou merge).
 * 								type = Quando for necessário conversão entre o banco e JS.
 * 									   Os tipos válidos são: 'number', 'string', 'json', 'date'
 * 								ex: {client_id : { autoIncrement:true}, client_name:{}, created:{generated:true}, verified{type:date}}
 *
 * @returns {object} Retorna dao configurado
 */
const dao = (pSource, pTableName, pTableModel) => {
    //Valores de TYPE foram definidos de forma binária através do somatório dos valores abaixo
    //1-READ 2-EDIT
    //8-READ 8-ADD 16-MODIFY 32-REMOVE}
    /** @enum {number} */
    // TYPE: { READ: 9, ADD: 10, MODIFY: 18, REMOVE: 34, MERGE: 26 },
    const TYPE = Object.freeze({
        READ: 9,
        ADD: 10,
        MODIFY: 18,
        REMOVE: 34,
        MERGE: 26
    });
    // DaysEnum = Object.freeze({"monday":1, "tuesday":2, "wednesday":3, ...})
    return Object.assign(
        {
            //1-READ 2-EDIT
            //8-READ 8-ADD 16-MODIFY 32-REMOVE}
            /** @enum {number} */
            // TYPE: { READ: 9, ADD: 10, MODIFY: 18, REMOVE: 34, MERGE: 26 },
            // TYPE: Object.freeze({
            //     READ: 9,
            //     ADD: 10,
            //     MODIFY: 18,
            //     REMOVE: 34,
            //     MERGE: 26
            // }),
            metadata: sqls.createMetadata(pTableName, pTableModel),
            /**
             * Método abstract chamado na validação
             * Para a efetiva validação, deve-se implementar este método no objeto Source
             *
             * @param {object} pAction Ação que está sendo validada conténdo {TYPE:tipo de ação, isEditin:se é uma edição de qualquer tipo, isRemoving:se é uma exclusão}
             * @param {object} pDataObject Objeto com os valores a serem inseridos.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a consulta.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @returns
             */
            onValidate(pAction, pDataObject, pConditions) {
                return Promise.resolve(pDataObject);
            },
            /**
             * Valida os dados
             *
             * @param {object} pTYPE
             * @param {object} pDataObject
             * @param {object} pConditions
             * @returns Promise com os novos dados já validados
             */
            validate(pTYPE, pDataObject, pConditions = null) {
                try {
                    let pAction = {
                        TYPE: pTYPE,
                        isEditing: (2 & pTYPE) == 2,
                        isRemoving: (32 & pTYPE) == 32
                    };
                    return this.onValidate(pAction, pDataObject, pConditions);
                } catch (pErr) {
                    gLog.error(pErr);
                    return Promise.reject(pErr);
                }
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
             * @returns Promise com a informação do than
             */
            readOne(pCN, pConditions, pColumns) {
                return new Promise((pResolve, pReject) => {
                    this.read(pCN, pConditions, pColumns, 1)
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
             * @param {number} [pLimit] Quantidade registros a serem lidos. Lê todos quando não especificado.
             * @returns Promise com os dados lidos ou null quando não existir
             */
            read(pCN, pConditions, pColumns, pLimit) {
                return new Promise((pResolve, pReject) => {
                    if (isEmpty(pCN)) {
                        return pReject('Conexão não informada');
                    }
                    // let xLogInfo = {};
                    let xRows = [];
                    sqls.getSqlSelect(
                        pCN,
                        this.metadata,
                        pConditions,
                        pColumns,
                        pLimit
                    )
                        .then(rSql => {
                            //Salva query para exibi-la em caso de erro
                            // xLogInfo = sqls.handleLogInfo('dao:modify', rSql);
                            //Executa Sql
                            return sqls.executeSql(rSql, rRow => {
                                //Adiciona linha(s) lida ao array
                                xRows.push(...rRow);
                            });
                        })
                        //Sucesso
                        .then(rResult => {
                            //Retorna linha lidas
                            pResolve(xRows);
                        })
                        //Erro
                        .catch(rErr => {
                            let xErr = SQLErrorResolver(rErr);
                            gLog.error(xErr);
                            pReject(xErr);
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
             * @returns Promise com os dados incluídos, inclusive com a autoincremento/sequence, se existir
             */
            add(pCN, pDataObject) {
                try {
                    return new Promise((pResolve, pReject) => {
                        // let xLogInfo = {};
                        let xDataObject = {};
                        //Valida os dados e recebe novo objeto com os dados já validados
                        this.validate(TYPE.ADD, pDataObject, null)
                            .then(rDataObject => {
                                if (isEmpty(pCN)) {
                                    return pReject('Conexão não informada');
                                }
                                //Salva dados já validados
                                xDataObject = rDataObject;
                                return sqls.getSqlInsert(
                                    pCN,
                                    this.metadata,
                                    rDataObject
                                );
                            })
                            .then(rSql => {
                                //Salva query para exibi-la em caso de erro
                                // xLogInfo = sqls.handleLogInfo('dao:add', rSql);
                                //Executa Sql
                                return sqls.executeSql(rSql);
                            })
                            //Sucesso
                            .then(rResult => {
                                //Se foi gerado um valor de autoincrement/sequence e houver a informação no DAO do nome da coluna
                                //inclui a coluna e respectivo valor como retorno da função
                                if (
                                    rResult.getAutoIncrementValue() > 0 &&
                                    !isEmpty(
                                        this.metadata.autoIncrementColumnName
                                    )
                                ) {
                                    //Inclui a coluna de autoincrement/sequence aos dados de retorno
                                    Object.assign(
                                        xDataObject,
                                        objectFromPropertyAndValue(
                                            this.metadata
                                                .autoIncrementColumnName,
                                            rResult.getAutoIncrementValue()
                                        )
                                    );
                                }
                                pResolve(xDataObject);
                            })
                            //Erro
                            .catch(rErr => {
                                let xErr = SQLErrorResolver(
                                    rErr,
                                    rErr.info.msg
                                );
                                gLog.error(xErr); //, { original: rErr.info.msg }
                                pReject(xErr);
                            });
                    });
                } catch (err) {
                    gLog.error(err);
                }
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
             * @returns Promise com a quantidade de registro excluídos
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
             * @returns Promise com a quantidade de registro excluídos
             */
            remove(pCN, pConditions, pLimit) {
                return new Promise((pResolve, pReject) => {
                    let xLogInfo = {};
                    //Valida os dados e recebe novo objeto com os dados já validados
                    this.validate(TYPE.REMOVE, null, pConditions)
                        .then(() => {
                            if (isEmpty(pCN)) {
                                return pReject('Conexão não informada');
                            }
                            return sqls.getSqlDelete(
                                pCN,
                                this.metadata,
                                pConditions,
                                pLimit
                            );
                        })
                        .then(rSql => {
                            //Salva query para exibi-la em caso de erro
                            xLogInfo = sqls.handleLogInfo('dao:remove', rSql);
                            //Executa Sql
                            return sqls.executeSql(rSql);
                        })
                        //Sucesso
                        .then(rResult => {
                            pResolve(rResult.getAffectedRowsCount());
                        })
                        //Erro
                        .catch(rErr => {
                            gLog.error(rErr, { ...rErr.info, ...xLogInfo });
                            pReject(rErr.message);
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
             * @returns Promise com os dados alterados ou null se nehum registro foi encontrado para edição
             */
            modify(pCN, pDataObject, pConditions, pLimit) {
                return new Promise((pResolve, pReject) => {
                    let xDataObject = {};
                    // let xLogInfo = {};
                    //Valida os dados e recebe novo objeto com os dados já validados
                    this.validate(TYPE.MODIFY, pDataObject, pConditions)
                        .then(rDataObject => {
                            if (isEmpty(pCN)) {
                                return pReject('Conexão não informada');
                            }
                            //Salva dados já validados
                            xDataObject = rDataObject;
                            return sqls.getSqlUpdate(
                                pCN,
                                this.metadata,
                                rDataObject,
                                pConditions,
                                pLimit
                            );
                        })
                        .then(rSql => {
                            //Salva query para exibi-la em caso de erro
                            // xLogInfo = sqls.handleLogInfo('dao:modify', rSql);
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
                            // gLog.error(rErr, { ...rErr.info, ...xLogInfo });
                            let xErr = SQLErrorResolver(rErr);
                            gLog.error(xErr);
                            pReject(xErr);
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
             * @returns Promise com os dados alterados/incluídos
             */
            merge(pCN, pDataObject, pConditions, pLimit) {
                return new Promise((pResolve, pReject) => {
                    //Valida os dados e recebe novo objeto com os dados já validados
                    this.validate(TYPE.MODIFY, pDataObject, pConditions)
                        .then(rDataObject => {
                            return this.modify(
                                pCN,
                                rDataObject,
                                pConditions,
                                pLimit
                            );
                        })
                        .then(rRow => {
                            if (!rRow) {
                                //Inclusão de novo registro
                                return this.add(pCN, pDataObject);
                            } else {
                                //     //Sucesso - Registro já existente foi alterado
                                return Promise.resolve(rRow);
                            }
                        })
                        //Sucesso
                        .then(rRow => {
                            pResolve(rRow);
                        })
                        //Erro
                        .catch(rErr => {
                            let xErr = SQLErrorResolver(rErr);
                            gLog.error(xErr);
                            pReject(xErr);
                        });
                });
            }
        },
        pSource
    );
};

module.exports = dao;
