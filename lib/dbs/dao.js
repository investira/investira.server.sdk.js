// @ts-ignore
const { isNull, isFunction } = require('investira.sdk').validators;
const { getDiff } = require('investira.sdk').objects;

const sqls = require('../utils/sqls');
// @ts-ignore
const { ConnectionRequired, ColumnRequired } = require('investira.sdk').messages.DataErrors;

//1-READ 2-EDIT
//1-READ 8-ADD 16-MODIFY 32-REMOVE}
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
 * 								Nome de colunas iniciados em '@' serão consideradas como variáveis de ambientes.
 * 								As variáveis de ambiente serão setadas durante a sessão utilizando o próprio nome da coluna(sem o '@') ou o nome informado no atributo 'name'.
 *								Atenção: Caso precisa trocar o valor da variável de ambiente durante uma mesma sessão, garanta que a execução de uma pesquisa
 *								só será efetuado após finalizada a anterior. *Consulte também a função sqls.setVariable*
 * 								Os atributos para definição da coluna são:
 * 								- autoIncrement = Coluna cujo valor é dado automáticamente pelo banco. Só poderá haver uma coluna como autoIncrement.
 * 												  Coluna autoincrement já é considerada como generated.
 * 								- generated = Colunas cujos valores são gerados automaticamente NO BANCO. Portanto não farão parte do add(insert) ou do update(modify ou merge).
 * 								- object = true
 * 								- type = Quando for necessário conversão entre o banco e JS.
 * 									      Os tipos válidos são: 'number', 'string', 'date', 'email', 'title' e 'object'.
 * 								- name = Nome real da variável de ambiente do banco caso seja diferente o próprio nome da coluna.
 * 										 Este atributo só deve ser utilizado quando o nome da coluna iniciar com '@' indicando que trata-se de uma coluna de variável de ambiente
 * 								ex: {client_id : { autoIncrement:true}, client_name:{}, created:{generated:true}, verified{type:date}, '@data':{name:'}}
 * @param {object} [pSource={}] Dao fonte
 * @returns {object} Retorna dao configurado
 */
const daoView = (pTableName, pTableModel, pSource = {}) => {
    const xDao = pvDao(pTableName, pTableModel, pSource);
    return Object.freeze(xDao);
};

// * @param {object} [pVariables=null] Objeto contendo o model das variávels de ambiente utilizadas nas views
// * 								     Quando este parametro é informado, os valores contidos na condições serão configurados via set

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
    const xDao = pvDao(pTableName, pTableModel, pSource);
    return Object.freeze(
        Object.assign(xDao, {
            /**
             * ----------------------------------------------------------------------------------
             * ADD
             * ----------------------------------------------------------------------------------
             * Insere registro
             *
             * @param {object} pCN Banco de dados(Schema)
             * @param {object} pDataObject Objeto com os valores a serem inseridos.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {boolean} [pIgnoreDuplicated=false] Ignorar error se ocorrer chave duplicada. Retornará Promise.resolve com conteúdo null.
             * @returns {Promise} com os dados incluídos, inclusive com a autoincremento/sequence, se existir
             */
            add(pCN, pDataObject, pIgnoreDuplicated = false) {
                if (isNull(pCN)) {
                    return Promise.reject(new ConnectionRequired());
                }
                return new Promise((pResolve, pReject) => {
                    let xDataObject = {};
                    //Valida os dados e recebe novo objeto com os dados já validados
                    return (
                        // @ts-ignore
                        this.validate(DAO_ACTION_TYPE.ADD, pDataObject, null)
                            .then(([rDataObject, _]) => {
                                //Salva dados já validados
                                xDataObject = rDataObject;
                                // @ts-ignore
                                return sqls.getSqlInsert(pCN, this.metadata, rDataObject, pIgnoreDuplicated);
                            })
                            .then(rSql => {
                                //Executa Sql
                                return sqls.executeSql(rSql);
                            })
                            //Sucesso
                            .then(rResult => {
                                if (rResult) {
                                    //Se foi gerado um valor de autoincrement/sequence e houver a informação no DAO do nome da coluna
                                    //inclui a coluna e respectivo valor como retorno da função
                                    if (
                                        rResult.getAutoIncrementValue() > 0 &&
                                        // @ts-ignore
                                        !isNull(this.metadata.autoIncrementColumnName)
                                    ) {
                                        //Inclui a coluna do autoincrement/sequence no objeto de retorno
                                        xDataObject[
                                            // @ts-ignore
                                            this.metadata.autoIncrementColumnName
                                        ] = rResult.getAutoIncrementValue();
                                    } else if (rResult.getWarnings().length > 0) {
                                        //Erro de registro duplicado
                                        if (pIgnoreDuplicated && rResult.getWarnings()[0].code === 1062) {
                                            //Se registro já existe e foi informado para ignorar o erro
                                            return pResolve(null);
                                        } else {
                                            return pReject(rResult.getWarnings()[0]);
                                        }
                                    }
                                }
                                pResolve(xDataObject);
                            })
                            //Erro
                            .catch(rErr => {
                                pReject(rErr);
                            })
                    );
                });
            },

            /**
             * ----------------------------------------------------------------------------------
             * REMOVE
             * ----------------------------------------------------------------------------------
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
                if (isNull(pCN)) {
                    return Promise.reject(new ConnectionRequired());
                }
                return new Promise((pResolve, pReject) => {
                    //Valida os dados e recebe novo objeto com os dados já validados
                    return (
                        // @ts-ignore
                        this.validate(DAO_ACTION_TYPE.REMOVE, null, pConditions)
                            .then(([_, rConditions]) => {
                                // @ts-ignore
                                return sqls.getSqlDelete(pCN, this.metadata, rConditions, pLimit);
                            })
                            .then(rSql => {
                                //Executa Sql
                                return sqls.executeSql(rSql);
                            })
                            //Sucesso
                            .then(rResult => {
                                pResolve({
                                    record_count: rResult.getAffectedItemsCount()
                                });
                            })
                            //Erro
                            .catch(rErr => {
                                pReject(rErr);
                            })
                    );
                });
            },

            /**
             * ----------------------------------------------------------------------------------
             * MODIFY
             * ----------------------------------------------------------------------------------
             * Atualiza dos dados utilizando
             *
             * @param {object} pCN Banco de dados(Schema)
             * @param {object} pDataObject Objeto com os valores a serem atualizados.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {object} pConditions Objeto com as condições para a atualização.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {number} [pLimit] Quantidade registros a serem atualizados. Quando não especificado, atualiza todos dentro do critério.
             *                          Para atualizar todos, sem critérios, pLimit deve ser null.
             * @returns {Promise} com os dados alterados ou null se nehum registro foi encontrado para edição
             */
            modify(pCN, pDataObject, pConditions, pLimit) {
                if (isNull(pCN)) {
                    return Promise.reject(new ConnectionRequired());
                }
                return new Promise((pResolve, pReject) => {
                    let xDataObject = {};
                    //Valida os dados e recebe novo objeto com os dados já validados
                    return (
                        // @ts-ignore
                        this.validate(DAO_ACTION_TYPE.MODIFY, pDataObject, pConditions)
                            .then(([rDataObject, rConditions]) => {
                                //Salva dados já validados
                                xDataObject = rDataObject;
                                // @ts-ignore
                                return sqls.getSqlUpdate(pCN, this.metadata, rDataObject, rConditions, pLimit);
                            })
                            .then(rSql => {
                                //Executa Sql
                                return sqls.executeSql(rSql);
                            })
                            //Sucesso
                            .then(rResult => {
                                if (rResult && rResult.getAffectedItemsCount() > 0) {
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
                            })
                    );
                });
            },

            /**
             * ----------------------------------------------------------------------------------
             * MERGE
             * ----------------------------------------------------------------------------------
             * Merge registro. Incluir se não existir e altera se já existir.
             * ATENÇÃO: Utilize sempre uma PK para efetuar o merge para evitar atualização em registros semelhantes.
             *
             * @param {object} pCN Banco de dados(Schema)
             * @param {object} pDataObject Objeto com os valores a serem atualizados.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {object} pConditions Objeto com as condições para a atualização.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @returns {Promise} com os dados alterados/incluídos
             */
            merge(pCN, pDataObject, pConditions) {
                if (isNull(pCN)) {
                    return Promise.reject(new ConnectionRequired());
                }
                return new Promise((pResolve, pReject) => {
                    //Valida os dados e recebe novo objeto com os dados já validados
                    return (
                        // @ts-ignore
                        this.validate(DAO_ACTION_TYPE.MODIFY, pDataObject, pConditions)
                            .then(([rDataObject, rConditions]) => {
                                //Inclusão de novo registro
                                return Promise.all([rDataObject, rConditions, this.add(pCN, rDataObject, true)]);
                            })
                            .then(([rDataObject, rConditions, rRow]) => {
                                if (!rRow) {
                                    return this.modify(pCN, rDataObject, rConditions, 1);
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
                            })
                    );
                });
            },
            /**
             * ----------------------------------------------------------------------------------
             * MODIFYONE
             * ----------------------------------------------------------------------------------
             * Atualiza dos dados utilizando
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
                if (isNull(pCN)) {
                    return Promise.reject(new ConnectionRequired());
                }
                pOptions = { currentDataObject: null, onDiff: null, ...pOptions };
                if (pOptions.currentDataObject) {
                    let xDiff = null;
                    // @ts-ignore
                    return this.validate(DAO_ACTION_TYPE.MODIFY, pDataObject, pConditions).then(
                        ([rDataObjectValidated, _rConditions]) => {
                            let xMergedDataObject = rDataObjectValidated;
                            xDiff = getDiff(pOptions.currentDataObject, rDataObjectValidated, rMerged => {
                                xMergedDataObject = rMerged;
                            });
                            if (xDiff) {
                                if (pOptions.onDiff && isFunction(pOptions.onDiff)) {
                                    pOptions.onDiff(xDiff);
                                }
                                return this.modify(pCN, xMergedDataObject, pConditions, 1);
                            } else {
                                return pOptions.currentDataObject;
                            }
                        }
                    );
                } else {
                    return this.modify(pCN, pDataObject, pConditions, 1);
                }
            }
        })
    );
};

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
const pvDao = (pTableName, pTableModel, pSource = {}) => {
    const abstract = Object.assign(
        {
            /**
             * Método abstract chamado na validação
             * Para a efetiva validação, deve-se implementar este método no objeto pSource
             *
             * @param {object} _pAction Ação que está sendo validada conténdo {TYPE:tipo de ação, isEditin:se é uma edição de qualquer tipo, isRemoving:se é uma exclusão}
             * @param {object} pDataObject Objeto com os valores a serem inseridos.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a consulta.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @returns {Promise}
             */

            onValidate(_pAction, pDataObject, pConditions) {
                return Promise.resolve([pDataObject, pConditions]);
            }
        },
        pSource
    );

    return Object.assign(abstract, {
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
                    isEditing: pTYPE & 2,
                    isRemoving: pTYPE & 32
                };
                return abstract
                    .onValidate(pAction, pDataObject, pConditions)
                    .then(rResult => {
                        pResolve(rResult);
                    })
                    .catch(rErr => {
                        // @ts-ignore
                        gLog.child({ _origin: { class: 'dao', function: 'validate' } }).error(rErr);
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
         * 					   	- Quando não informada ou null, retorna todas as colunas descritas no atributo 'columns' do metadado do Dao.
         * 						- Quando informada como array vazio [], retorna quantidade de registros da pesquisa.
         * @param {number | object} [pClauses={}] {sort, group, limit:{page, offset, size}} Outras cláusulas da consulta
         * - sort: texto para a cláusula 'Order by'
         * - limit:
         * -- page: Página a partir da qual serão lidos a quantidade de registros definida em 'size'.
         *    Deve informar 'size' quando 'page' for informado, ou será considerado como 20 registros por página
         * -- offset: Registro a partir do qual serão lidos a quantidade de registros definida em 'size'.
         *    Caso 'page' tenha sido informado, 'offset' será recalculado em função de 'page' e 'size'.
         * -- size: Quantidade registros a serem lidos. Lê todos quando não especificado.
         * - group: texto para a cláusula 'Group By'
         * - having: texto para a cláusula 'Having'
         * - lock: 'FOR UPDATE', 'LOCK IN SHARE MODE', 'SKIP LOCKED', 'NOWAIT'
         * @returns {Promise} com a informação do than
         */
        readOne(pCN, pConditions, pColumns, pClauses = {}) {
            return new Promise((pResolve, pReject) => {
                return (
                    this.read(pCN, pConditions, pColumns, { ...pClauses, limit: { size: 1 } })
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
                        })
                );
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
         * @param {number | object} [pClauses={}] {sort, group, limit:{page, offset, size}} Outras cláusulas da consulta
         * - sort: texto para a cláusula 'Order by'
         * - limit:
         * -- page: Página a partir da qual serão lidos a quantidade de registros definida em 'size'.
         *    Deve informar 'size' quando 'page' for informado, ou será considerado como 20 registros por página
         * -- offset: Registro a partir do qual serão lidos a quantidade de registros definida em 'size'.
         *    Caso 'page' tenha sido informado, 'offset' será recalculado em função de 'page' e 'size'.
         * -- size: Quantidade registros a serem lidos. Lê todos quando não especificado.
         * - group: texto para a cláusula 'Group By'
         * - having: texto para a cláusula 'Having'
         * - lock: 'FOR UPDATE', 'LOCK IN SHARE MODE', 'SKIP LOCKED', 'NOWAIT'
         * @returns {Promise} com os dados lidos ou null quando não existir
         */
        read(pCN, pConditions, pColumns, pClauses = {}) {
            return new Promise((pResolve, pReject) => {
                if (isNull(pCN)) {
                    return pReject(new ConnectionRequired());
                }
                // @ts-ignore
                if (pColumns && pColumns === []) {
                    return pReject(new ColumnRequired());
                }
                let xRows = [];
                let xErr = null;
                return (
                    this.validate(DAO_ACTION_TYPE.READ, null, pConditions)
                        .then(([_, rConditions]) => {
                            return sqls.getSqlSelect(pCN, this.metadata, rConditions, pColumns, pClauses);
                        })
                        .then(rSql => {
                            //Executa Sql
                            return sqls.executeSql(rSql, rRows => {
                                try {
                                    //Loop nas linhas lidas
                                    for (let xRow of rRows) {
                                        //Converte o dado lido para JS conforme o metadata
                                        xRow = sqls.convertToJS(this.metadata, xRow);
                                        //Adiciona linha(s) lida ao array
                                        xRows.push(xRow);
                                    }
                                } catch (rErr) {
                                    xErr = rErr;
                                }
                            });
                        })
                        //Sucesso
                        .then(_rResult => {
                            if (xErr) {
                                return pReject(xErr);
                            }
                            //Retorna linha lidas
                            pResolve(xRows);
                        })
                        //Erro
                        .catch(rErr => {
                            pReject(rErr);
                        })
                );
            });
        }
    });
};

module.exports.dao = dao;
module.exports.daoView = daoView;
module.exports.DAO_ACTION_TYPE = DAO_ACTION_TYPE;
