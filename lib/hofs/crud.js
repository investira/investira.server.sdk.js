/**
 * Objeto para manipulação de dados, podendo se de um único dao ou de vários.
 * As regras de negócio para deverão ser implementadas nos métodos:
 * onAdd, onModify, onRemove, onRemoveOne, onRead, onReadOne, onMerge e onValidate.
 *
 * @param {*} pSource
 * @returns
 */
const crud = pSource => {
    //Valores de TYPE foram definidos de forma binária através do somatório dos valores abaixo
    //1-READ 2-EDIT
    //8-READ 8-ADD 16-MODIFY 32-REMOVE}
    TYPE = { READ: 9, ADD: 10, MODIFY: 18, REMOVE: 34, MERGE: 26 };

    return Object.assign(
        {
            /**
             * Método abstract chamado na validação
             * Para a efetiva validação, deve-se implementar este método no objeto Source
             *
             * @param {Object} pAction Ação que está sendo validada conténdo {TYPE:tipo de ação, isEditin:se é uma edição de qualquer tipo, isRemoving:se é uma exclusão}
             * @param {Object} pDataObject Objeto com os valores a serem inseridos.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {Object} pConditions Objeto com os atributos e respectivos valores para a consulta.
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
             * @param {*} pTYPE
             * @param {Object} pDataObject
             * @param {Object} pConditions
             * @returns Promise com os novos dados já validados
             */
            validate(pTYPE, pDataObject, pConditions) {
                try {
                    let pAction = {
                        TYPE: pTYPE,
                        isEditing: (2 & pTYPE) == 2,
                        isRemoving: (32 & pTYPE) == 32
                    };
                    return this.onValidate(pAction, pDataObject, pConditions);
                } catch (err) {
                    gLog.error(err);
                }
            },
            /**
             * Retorna somente um registro, caso exista e null, caso não exista.
             *
             * @param {*} pCN Banco de dados(Schema)
             * @param {Object} pConditions Objeto com os atributos e respectivos valores para a consulta.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {Array} pColumns Array com os nomes das colunas a serem retornadas. ex: ["user","name"].
             * 					   Quando não informada ou null, retorna todas as colunas descritas no atributo 'columns' do metadado do Dao.
             * @returns Promise com a informação do than
             */
            readOne(pCN, pConditions, pColumns) {
                try {
                    return this.onReadOne(pCN, pConditions, pColumns);
                } catch (err) {
                    gLog.error(err);
                }
            },
            /**
             * Retorna os registros conforme o objeto pConditions
             *
             * @param {*} pCN Banco de dados(Schema)
             * @param {Object} pConditions Objeto com os atributos e respectivos valores para a consulta.
             * 						       Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						       ex: {client_id: 2, client_name: "teste"}
             * @param {Array} pColumns Array com os nomes das colunas a serem retornadas. ex: ["user","name"]
             * 					       Quando não informada ou null, retorna todas as colunas descritas no atributo 'columns' do metadado do Dao.
             * @param {Number} [pLimit=null] Quantidade registros a serem lidos. Lê todos quando não especificado.
             * @returns Promise com os dados lidos ou null quando não existir
             */
            read(pCN, pConditions, pColumns, pLimit) {
                try {
                    return this.onRead(pCN, pConditions, pColumns, pLimit);
                } catch (err) {
                    gLog.error(err);
                }
            },
            /**
             * Inserir registro
             *
             * @param {*} pCN Banco de dados(Schema)
             * @param {Object} pDataObject Objeto com os valores a serem inseridos.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @returns Promise com os dados incluídos, inclusive com a autoincremento/sequence, se existir
             */
            add(pCN, pDataObject) {
                try {
                    //Valida os dados e recebe novo objeto com os dados já validados
                    return this.validate(TYPE.ADD, pDataObject, null).then(
                        rDataObject => {
                            return this.onAdd(pCN, rDataObject);
                        }
                    );
                } catch (err) {
                    gLog.error(err);
                }
            },
            /**
             * Excluir somente um registro, caso exista
             *
             * @param {*} pCN Banco de dados(Schema)
             * @param {Object} pConditions Objeto com os atributos e respectivos valores para a exclusão.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @returns Promise com a quantidade de registro excluídos
             */
            removeOne(pCN, pConditions) {
                try {
                    //Valida os dados e recebe novo objeto com os dados já validados
                    return this.validate(TYPE.REMOVE, null, pConditions).then(
                        () => {
                            return this.onRemoveOne(pCN, pConditions);
                        }
                    );
                } catch (err) {
                    gLog.error(err);
                }
            },
            /**
             * Excluir os registro conforme a os valores de pConditions
             *
             * @param {*} pCN Banco de dados(Schema)
             * @param {Object} pConditions Objeto com os atributos e respectivos valores para a exclusão.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {number} [pLimit=0] Quantidade registros a serem excluídos. Exclui todos quando não especificado.
             * @returns Promise com a quantidade de registro excluídos
             */
            remove(pCN, pConditions, pLimit = null) {
                try {
                    //Valida os dados e recebe novo objeto com os dados já validados
                    return this.validate(TYPE.REMOVE, null, pConditions).then(
                        () => {
                            return this.onRemove(pCN, pConditions, pLimit);
                        }
                    );
                } catch (err) {
                    gLog.error(err);
                }
            },
            /**
             * Atualizar dos dados utilizando
             *
             * @param {*} pCN Banco de dados(Schema)
             * @param {Object} pDataObject Objeto com os valores a serem atulizados.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {Object} pConditions Objeto com as condições para a atualização.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {number} [pLimit=0] Quantidade registros a serem atulizados. Atualiza todos quando não especificado.
             * @returns Promise com os dados alterados ou null se nehum registro foi encontrado para edição
             */
            modify(pCN, pDataObject, pConditions, pLimit) {
                try {
                    //Valida os dados e recebe novo objeto com os dados já validados
                    return this.validate(
                        TYPE.MODIFY,
                        pDataObject,
                        pConditions
                    ).then(rDataObject => {
                        return this.onModify(
                            pCN,
                            rDataObject,
                            pConditions,
                            pLimit
                        );
                    });
                } catch (err) {
                    gLog.error(err);
                }
            },
            /**
             * Merge registro. Altera se existir. Inclui se não existir.
             *
             * @param {*} pCN Banco de dados(Schema)
             * @param {Object} pDataObject Objeto com os valores a serem atulizados.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {Object} pConditions Objeto com as condições para a atualização.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {number} [pLimit=0] Quantidade registros a serem atualizados. Atualiza todos quando não especificado.
             * @returns Promise com os dados alterados/incluídos
             */
            merge(pCN, pDataObject, pConditions, pLimit) {
                try {
                    //Valida os dados e recebe novo objeto com os dados já validados
                    return this.validate(
                        TYPE.MERGE,
                        pDataObject,
                        pConditions
                    ).then(rDataObject => {
                        return this.onMerge(
                            pCN,
                            rDataObject,
                            pConditions,
                            pLimit
                        );
                    });
                } catch (err) {
                    gLog.error(err);
                }
            }
        },
        pSource
    );
};

module.exports = crud;
