// @ts-ignore
const { isNull, isFunction } = require('investira.sdk').validators;
const { getDiff, deepCopy } = require('investira.sdk').objects;

const sqls = require('../utils/sqls');
// @ts-ignore
const { ConnectionRequired, ColumnRequired } = require('investira.sdk').messages.DataErrors;
// @ts-ignore
const { BadRequestError } = require('investira.sdk').messages.ClientErrors;

const SELECT_COUNT = 'count(*)';

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
             * @param {object} pCN Banco de dados(Conexão)
             * @param {object} pDataObject Objeto com os valores a serem inseridos.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {number | object} [pOptions={}]
             * - ignoreDuplicated: Ignorar error se ocorrer chave duplicada.
             * - encryptionKey: Chave utilizada para criptografar as colunas 'encrypted'
             * @returns {Promise} com os dados incluídos, inclusive com a autoincremento/sequence, se existir
             */
            add(pCN, pDataObject, pOptions) {
                if (isNull(pCN)) {
                    return Promise.reject(new ConnectionRequired());
                }
                let xDataObject = {};
                //Valida os dados e recebe novo objeto com os dados já validados
                return (
                    // @ts-ignore
                    this.validate(DAO_ACTION_TYPE.ADD, pDataObject, null)
                        .then(([rDataObject, _]) => {
                            //Salva dados já validados
                            xDataObject = rDataObject;
                            // @ts-ignore
                            return sqls.getSqlInsert(pCN, this.metadata, rDataObject, pOptions);
                        })
                        .then(rSql => {
                            //Executa Sql
                            return sqls.executeSql(pCN, rSql);
                        })
                        //Sucesso
                        .then(rResult => {
                            if (rResult) {
                                //Se foi gerado um valor de autoincrement/sequence e houver a informação no DAO do nome da coluna
                                //inclui a coluna e respectivo valor como retorno da função
                                if (
                                    rResult.insertId > 0 &&
                                    // @ts-ignore
                                    !isNull(this.metadata.autoIncrementColumnName)
                                ) {
                                    //Inclui a coluna do autoincrement/sequence no objeto de retorno
                                    // @ts-ignore
                                    xDataObject[this.metadata.autoIncrementColumnName] = rResult.insertId;
                                } else if (rResult.warningStatus) {
                                    //Recupera os Warnings
                                    return sqls.getWarnings(pCN).then(rResult => {
                                        if (rResult.length === 0) {
                                            return null;
                                        }
                                        //Erro de registro duplicado
                                        if (pOptions.ignoreDuplicated && rResult[0].Code === 1062) {
                                            //Se registro já existe e foi informado para ignorar o erro
                                            return null;
                                        } else {
                                            return Promise.reject(new BadRequestError(rResult[0].Message));
                                        }
                                    });
                                }
                            }
                            return xDataObject;
                        })
                );
            },

            /**
             * ----------------------------------------------------------------------------------
             * REMOVE
             * ----------------------------------------------------------------------------------
             * Exclui somente um registro, caso exista
             *
             * @param {object} pCN Banco de dados(Conexão)
             * @param {object} pConditions Objeto com os atributos e respectivos valores para a exclusão.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
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
             * - encryptionKey: Chave utilizada para criptografar as colunas 'encrypted'
             * @returns {Promise} com a quantidade de registro excluídos
             */
            removeOne(pCN, pConditions, pClauses) {
                //Força a remoção somente de 1 registro
                return this.remove(pCN, pConditions, { ...pClauses, limit: 1 });
            },

            /**
             * Exclui os registro conforme a os valores de pConditions
             *
             * @param {object} pCN Banco de dados(Conexão)
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
             * - encryptionKey: Chave utilizada para criptografar as colunas 'encrypted'
             * @returns {Promise} com a quantidade de registro excluídos
             */
            remove(pCN, pConditions, pClauses = {}) {
                if (isNull(pCN)) {
                    return Promise.reject(new ConnectionRequired());
                }
                //Valida os dados e recebe novo objeto com os dados já validados
                return (
                    // @ts-ignore
                    this.validate(DAO_ACTION_TYPE.REMOVE, null, pConditions)
                        .then(([_, rConditions]) => {
                            // @ts-ignore
                            return sqls.getSqlDelete(pCN, this.metadata, rConditions, pClauses);
                        })
                        .then(rSql => {
                            //Executa Sql
                            return sqls.executeSql(pCN, rSql);
                        })
                        //Sucesso
                        .then(rResult => {
                            return { record_count: rResult.affectedRows };
                        })
                );
            },

            /**
             * ----------------------------------------------------------------------------------
             * MODIFY
             * ----------------------------------------------------------------------------------
             * Atualiza dos dados utilizando
             *
             * @param {object} pCN Banco de dados(Conexão)
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
             * - encryptionKey: Chave utilizada para criptografar as colunas 'encrypted'
             * - returnRowsCount: indica se retorna a quantidade de registros encontrados e efetados
             * @returns {Promise} com os dados alterados ou null se nehum registro foi encontrado para edição
             */
            modify(pCN, pDataObject, pConditions, pClauses = {}) {
                if (isNull(pCN)) {
                    return Promise.reject(new ConnectionRequired());
                }
                //Valida os dados e recebe novo objeto com os dados já validados
                return (
                    // @ts-ignore
                    this.validate(DAO_ACTION_TYPE.MODIFY, pDataObject, pConditions).then(
                        ([rDataObject, rConditions]) => {
                            //Salva dados já validados
                            const xDataObject = { ...(rConditions || {}), ...(rDataObject || {}) };
                            return (
                                sqls
                                    // @ts-ignore
                                    .getSqlUpdate(pCN, this.metadata, rDataObject, rConditions, pClauses)
                                    .then(rSql => {
                                        //Executa Sql
                                        return sqls.executeSql(pCN, rSql);
                                    })
                                    .then(rResult => {
                                        //obs:
                                        // o atributo changedRows informa a quantidade registros efetivamente altarada
                                        // o atributo affectedRows informa a quantidade registros encontrados conforme o critério da pesquisa
                                        //pois os valores alterados são identicos aos existentes
                                        if (rResult) {
                                            //Retorna a quantidade de registros efetados e encontrados
                                            if (pClauses && pClauses.returnRowsCount) {
                                                return { found: rResult.affectedRows, changed: rResult.changedRows };
                                                //Retorna os dados utilizados para efetuar o update se algum registro tiver sido encontrado
                                            } else if (rResult.affectedRows) {
                                                return xDataObject;
                                            }
                                        }
                                        //Se não houver edição, retorna null
                                        return null;
                                    })
                            );
                        }
                    )
                );
            },

            /**
             * ----------------------------------------------------------------------------------
             * MERGE
             * ----------------------------------------------------------------------------------
             * Merge registro. Incluir se não existir e altera se já existir.
             * ATENÇÃO: Utilize sempre uma PK para efetuar o merge para evitar atualização em registros semelhantes.
             *
             * @param {object} pCN Banco de dados(Conexão)
             * @param {object} pDataObject Objeto com os valores a serem atualizados.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {object} pConditions Objeto com as condições para a atualização.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
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
             * - encryptionKey: Chave utilizada para criptografar as colunas 'encrypted'
             * @returns {Promise} com os dados alterados/incluídos
             */
            merge(pCN, pDataObject, pConditions, pClauses = {}) {
                if (isNull(pCN)) {
                    return Promise.reject(new ConnectionRequired());
                }
                //Valida os dados e recebe novo objeto com os dados já validados
                return (
                    // @ts-ignore
                    this.validate(DAO_ACTION_TYPE.MODIFY, pDataObject, pConditions).then(
                        ([rDataObject, rConditions]) => {
                            return this.add(pCN, rDataObject, { ...pClauses, ignoreDuplicated: true }).then(rRow => {
                                if (!rRow) {
                                    //Altera caso não tenha sido incluido nenhum registro
                                    return this.modify(pCN, rDataObject, rConditions, { ...pClauses, limit: 1 });
                                } else {
                                    //Sucesso - Registro já existente foi alterado
                                    return rRow;
                                }
                            });
                        }
                    )
                );
            },
            /**
             * ----------------------------------------------------------------------------------
             * MODIFYONE
             * ----------------------------------------------------------------------------------
             * Atualiza dos dados utilizando
             *
             * @param {object} pCN Banco de dados(Conexão)
             * @param {object} pDataObject Objeto com os valores a serem atualizados.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {object} pConditions Objeto com as condições para a atualização.
             * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
             * 						  ex: {client_id: 2, client_name: "teste"}
             * @param {object} [pOptions={}] { currentDataObject, onDiff, encryptionKey}
             * - currentDataObject: Objeto com dados atuais
             * - onDiff: Função que será chamada, caso haja diferença, contendo dados da diferença.
             * - encryptionKey: Chave utilizada para criptografar as colunas 'encrypted'
             * @returns {Promise} com os dados alterados ou null se nehum registro foi encontrado para edição
             */
            modifyOne(pCN, pDataObject, pConditions, pOptions = {}) {
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
                            //Verifica se há diferença
                            xDiff = getDiff(pOptions.currentDataObject, rDataObjectValidated, rMerged => {
                                xMergedDataObject = rMerged;
                            });
                            //Efetua o modify se houver diferença
                            if (xDiff) {
                                return this.modify(pCN, xMergedDataObject, pConditions, { ...pOptions, limit: 1 }).then(
                                    () => {
                                        //Chama função de callback recebendo o que foi alterado
                                        if (pOptions.onDiff && isFunction(pOptions.onDiff)) {
                                            pOptions.onDiff(xDiff);
                                        }
                                    }
                                );
                            } else {
                                return pOptions.currentDataObject;
                            }
                        }
                    );
                } else {
                    return this.modify(pCN, pDataObject, pConditions, { ...pOptions, limit: 1 });
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
            let pAction = {
                TYPE: pTYPE,
                isEditing: pTYPE & 2,
                isRemoving: pTYPE & 32
            };
            return abstract.onValidate(pAction, pDataObject, pConditions).catch(rErr => {
                // @ts-ignore
                gLog.child({ _origin: { class: 'dao', function: 'validate' } }).error(rErr);
                return Promise.reject(rErr);
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
         * @param {object} pCN Banco de dados(Conexão)
         * @param {object} pConditions Objeto com os atributos e respectivos valores para a consulta.
         * 						  Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
         * 						  ex: {client_id: 2, client_name: "teste"}
         * @param {Array} pColumns Array com os nomes das colunas a serem retornadas. ex: ["user","name"].
         * 					   	- Quando não informada ou null, retorna todas as colunas descritas no atributo 'columns' do metadado do Dao.
         * 						- Quando informada como array vazio [], retorna quantidade de registros da pesquisa.
         * @param {number | object} [pClauses={}]
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
         * - encryptionKey: Chave utilizada para criptografar as colunas 'encrypted'
         * @returns {Promise} com a informação do than
         */
        readOne(pCN, pConditions, pColumns, pClauses = {}) {
            return (
                this.read(pCN, pConditions, pColumns, { ...pClauses, limit: 1 })
                    //Sucesso
                    .then(rRow => {
                        //Retorna uma linha
                        if (rRow && rRow.length > 0) {
                            return rRow[0];
                            //Retorna null
                        } else {
                            return null;
                        }
                    })
            );
        },

        /**
         * Retorna os registros conforme o objeto pConditions
         *
         * @param {object} pCN Banco de dados(Conexão)
         * @param {object} pConditions Objeto com os atributos e respectivos valores para a consulta.
         * 						       Os nomes dos atributos do object deve ser iguais aos respectivos nomes das colunas na tabela.
         * 						       ex: {client_id: 2, client_name: "teste"}
         * @param {Array} pColumns Array com os nomes das colunas a serem retornadas. ex: ["user","name"]
         * 					       Quando não informada ou null, retorna todas as colunas descritas no atributo 'columns' do metadado do Dao.
         * @param {number | object} [pClauses={}]
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
         * - encryptionKey: Chave utilizada para criptografar as colunas 'encrypted'
         * @returns {Promise} com os dados lidos ou null quando não existir
         */
        async read(pCN, pConditions, pColumns, pClauses = {}) {
            if (isNull(pCN)) {
                return Promise.reject(new ConnectionRequired());
            }
            // @ts-ignore
            if (pColumns && pColumns === []) {
                return Promise.reject(new ColumnRequired());
            }
            //Cria cópia do metadata para evitar contaminação,
            //pois o getSqlSelect pode incluir novas colunas no tableModel quando há coluna como formula.
            let xMetadata = deepCopy(this.metadata);
            return this.validate(DAO_ACTION_TYPE.READ, null, pConditions)
                .then(([_, rConditions]) => {
                    return sqls.getSqlSelect(pCN, xMetadata, rConditions, pColumns, pClauses);
                })
                .then(rSql => {
                    //rSql pode estar null quando a execução é cancelada antes de aguardar a resposta
                    if (!rSql) {
                        return Promise.resolve([]);
                    }
                    //Executa Sql e reseta possíveis variáveis de ambiente '@' para nulo
                    //para que não figuem persistindo e sejam utilizada em outras consultas
                    return (
                        sqls
                            .executeSql(pCN, rSql)
                            .finally(() => {
                                //Reseta variável de ambiente '@' para null após a utilização
                                if (pConditions) {
                                    for (const xKey in pConditions) {
                                        if (xKey.substring(0, 1) === '@') {
                                            sqls.setVariable(pCN, xKey, null);
                                        }
                                    }
                                }
                            })
                            //Sucesso
                            .then(rResult => {
                                try {
                                    //Se for contador
                                    if (
                                        (!pColumns || pColumns.length === 0) &&
                                        rResult &&
                                        rResult.length === 1 &&
                                        rResult[0] &&
                                        rResult[0][SELECT_COUNT] !== undefined
                                    ) {
                                        return [rResult[0][SELECT_COUNT]];
                                    }
                                    const xRows = [];
                                    //Loop nas linhas lidas
                                    for (let xRow of rResult) {
                                        //Converte o dado lido para JS conforme o metadata (ajustado se for o caso de coluna com formula)
                                        xRow = sqls.convertToJS(xMetadata, xRow, pClauses);
                                        //Adiciona linha(s) lida ao array
                                        xRows.push(xRow);
                                    }
                                    return xRows;
                                } catch (rErr) {
                                    return Promise.reject(rErr);
                                }
                            })
                    );
                });
        }
    });
};

module.exports.dao = dao;
module.exports.daoView = daoView;
module.exports.DAO_ACTION_TYPE = DAO_ACTION_TYPE;
