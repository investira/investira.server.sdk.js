# 1.0.6

-   [files] Novo módulo files, com funções 'projectPath' e 'sep'.
-   [mySqlServer] Exclusão de log no commit e no rollback.

# 1.0.7

-   [files] Nova função 'download'.
-   [sqls] Novo operador 'in'.

# 1.0.8

-   [sqls] e [daos] refactor do limit e inclusão de groupBy.
-   [sqls] correção do operador 'in'.

# 1.0.9

-   [sqls] correção para value da columa com type JSON.

# 1.0.10

-   [sqls] Implementação para pertimir nomes reservados como nome de colunas no banco.

# 1.0.11

-   [authorization] Correção: Returns nos Rejects.
-   [sqls] Operador 'in': controlado também pelo bind para evitar sql inject.
-   [sqls] Operador 'in': valor poder receber um array.
-   [sqls] Novo operador 'like'.
-   [endpointResponse] Criação automática de atributo req.clauses contendo {sort,limit:{page,offset,size}} a partir dos parametros da query.

# 1.0.12

-   [files] Nova função 'read' para ler arquivos.
-   [files] Nova função 'unzip' para descompactar arquivos.
-   [files] Nova função 'mkdir' para criar pasta se não existir.
-   [files] Nova função 'rename' para renomear arquivo e pastas.

# 1.1.0

-   [sqls] Controle de Datamodel com atributos sendo objetos dentro de objetos.
-   [files] 'read' controlando quebra de linha por parametro.
-   [sqls] e [dao] Campos 'json' com validação e conversão conforme model e possibilidade de pesquisa por atributo.

# 1.1.1

-   [sqls] Otimização do tratamento de condições.
-   [sqls] Inclusão de operador 'BETWEEN'.

# 1.1.2

-   [sqls] Correção - pvModelCompliance.

# 1.1.3

-   [daos] Source com valor default.

# 1.1.4

-   [daos] Correção do dao.

# 1.1.5

-   [daos] Exibição da query quando houver erro.
-   [daos] Bug: Não estava retornando coluna com valor zero.

# 1.2.0

-   [daos] Conversão de array de json para array de object.
-   [files] Nova função 'readDir'. Retornar lista de arquivos de uma pasta.
-   [files] Nova função 'isDir'. Retorna se arquivo é um diretório.
-   [files] Nova função 'isFile'. Retorna se é realmente um arquivo.
-   [files] Nova função 'remove'. Remover arquivo localmente.
-   [files] unzip retorna lista dos arquivos descompactados.
-   [files] retirada catch do 'download' para que seja tradado pelo chamador.
-   [sqls] Tentativa automÁtica se novo insert após 'Deadlock'.
-   [sqls] Opção de 'Select' para não retornar nenhuma coluna.
-   [sqls] Correção quando valor do campo é 'undefined'.
-   [sqls] Bloqueio de update quando não houver critério definido.
-   [sqls] Bloqueio de select quando colunas no cretério não fizerem parte do tableModel.
-   [sqls] Novo tipo de dado 'datetime'. tipo 'date' somente armazenará data sem a hora.
-   [sqls] Novo operador 'NOT IN'.
-   [sqls] Operadoradores 'IN' e 'NOT IN' passa a aceitar null como valor válido da lista.
-   [sqls] Valor para operadorador 'BETWEEN' pode ser informado como String, Array ou parametro extra.

# 1.2.1

-   [sqls] Correção da leitura de dados do banco quando for do date ou datetime.

# 1.2.2

-   [sqls] Correção de bug MYSQL que arredonda JS number. Artifício foi converter number para string antes de salvar.
-   [files] Implementação de 'download' por FTP.
-   [files] Implementação de 'readFile' para arquivos 'Excel'.

# 1.2.3

-   Correção do número da versão.

# 1.2.4

-   [sqls] Novos operadores 'NOT LIKE' e binários '&' e '|'.
-   [sqls,requestContext,mySqlServer,endpointResponse,authorization] Controle de request abortado pelo usuário.

# 1.2.5

-   [sqls,dao,crud] 'readOne' retorna quantidade de registros se coluna da pesquisa for array vázio [].
-   [files] Implementação de 'readFile' para arquivos 'XML'.
-   [files] Nova função 'fileExt' para retornar a extensão do arquivo.
-   [sql] Propriedades con conteúdo null não farão parte do insert.
-   [sql] Fix: Operador 'IN' em coluna JSON pesquisando string.
-   [sql] Novos operadores 'NOT IN LIKE' e 'IN LIKE'.
-   [sql] Operadores 'LIKE', 'NOT LIKE','NOT IN LIKE' e 'IN LIKE' podem receber array com valores.

# 1.2.6

-   [sql] Fix: Operador 'NOT IN'

# 1.2.7

-   [sql] Fix: operadores simples

# 1.2.8

-   [sql,dao,crud] Implementação da cláusula 'group' para 'group by' nas clauses.
-   [sql,dao,crud] Implementação de função dentro da lista das colunas selecionadas. ex:['pessoa_id', ['data', 'max(`data`)']].
-   [dao] Implementação de configuração de variável de ambiente do banco para utilização em view pelo atributo do model que iniciar por '@'.
-   [sql] Nova função 'setVariable' para configuração de variável de ambiente do banco.
-   [daoView] Nova objeto _dao_ direcionado para views

# 1.2.9

-   [files] 'readFile' passa a separar colunas utilizando 'tab' na leitura de XLS.
-   [files] Fix: 'download' estava definindo o nome de arquivo considerando os parametros da url.
-   [files] Nova função 'rmDir' para excluir pasta
-   [sql] Fix: Coluna json com type:'number' estavam estavam sendo convertidas para número, mas armazenadas como string.
-   [sql] Fix: Clausula 'IN' com array contendo null.
-   [sql] Método 'merge' passa a efetuar o insert antes do update.
-   [sql,dao,crud] Novo tipo de dado 'time' contendo somente a hora:minuto:segundo.
-   [sql,dao,crud] Fix: query com not null

# 1.2.10

-   [files] 'Download' com novo atributo 'filename' para forçar o nome do arquivo a ser salvo, caso não a requisição não forneça automaticamente
-   [files] Fix: 'Read' - inclusão de try/catch

# 1.2.11

-   [files] fix: 'download' - configuração do timeout.
-   [sqls] fix: Implementado artifício para corrigir problema do mySql com casas decimais no insert em colunas raiz e no update em atributos de colunas json.

# 1.2.12

-   [sqls] fix: Conversão para Decimal quando valor é vazio.
-   [sqls] Inclusão de operador '^'.
-   [files] 'readFile' Implementação de leitura de arquivo pdf.

# 1.2.13

-   [dao] Inclusão do parametro 'Clauses' no 'readOne'.
-   [files] <code>unzip</code> passa a desconsiderar arquivos com começam com '.' (hidden file no mac) ou terminal com '/' (diretório).

# 1.2.14

-   [files] <code>rmDir</code> com chamada recursiva.
-   [files] <code>readFile</code> para arquivos XLS, com seleção da página.

# 1.2.15

-   [files] <code>unzip</code> com parametro validateEntrySizes.

# 1.2.16

-   [dao] e [crud] Novo método <code>modifyOne</code>

# 1.2.17

-   [dao] e [crud] <code>modifyOne</code> com callback contendo informação do que foi modificado

# 1.2.18

-   Atualização do investira.sdk

# 1.2.19

-   [sqls] Validação de valor nulo em pvConvertValue

# 1.2.20

-   [investira.data] Alterado para peer dependency

# 1.2.21

-   [files] Nova <code>exists</code> função para verificar se arquivo ou diretório existem
-   [sqls] Permitir consulta com conditions somente com variáveis de ambiente ('@')

# 1.2.22

-   [transactionWrapper] Novo objeto para execução de função dentro de uma transação

# 1.2.23

    Export

# 1.2.24

-   [transactionWrapper] Otimização

# 1.2.25

-   Atualização do investira.sdk

# 1.2.26

-   [endpointResponse] Utilização dos novos atributos das mensagens básicas

# 1.2.27

-   [files] <code>remove</code> com novo atributo IgnoreNotFound
-   Atualização de segurança

# 1.2.28

-   [files] leitura de arquivo json.

# 1.2.29

-   [requestConext] Redução dos logs padrão

# 1.2.30

-   [systems] Novo módulo com metodos sobre o sistema

# 1.3.0

-   [logs] Novo módulos para controles de logs

# 2.0.0

Refactor do log

# 2.0.1

-   [sqls] Mensagens com detail

# 2.0.2

-   [log] Retorna função e não mais o resultado da função. ATENÇÃO: Inicialização deveser efetuada como 'log()' e não mais simplemente 'log'.
-   [logs] Criação de log por data

# 2.0.3

-   [log] Criação de global.gLog padrão.

# 2.0.4

    Atualização do investira.sdk

# 2.0.5

    Atualização do investira.sdk

# 2.0.6

-   [dao] Inclusão de informação de origem do erro
-   [endpointResponse] Inclusão de informação de origem do erro
-   [logs] Exclusão do prettyPrint
-   [sse] Novo módulo para conexão sse

# 2.0.7

-   [endpointResponse] Correção da exibição do stack

# 2.0.8

-   [endpointResponse] Configuração automática da paginação de requests
-   [sqls] Alteração do log quando não há condição informada na query

# 2.0.9

-   [logs] Correção da exibição do timestamp

# 2.0.10

-   [endpointResponse] Padronização da resposta de erro
-   [logs] Utilização do stringfy no log

# 2.0.11

Atualização do investira.sdk

# 2.0.12

-   [files] Novo método <code>stat</code> para retornar os dados do arquivo incluindo o nome

# 2.0.13

Atualização do investira.sdk

# 2.0.14

-   [dao] Otimização do tratamento de erro de conversão
-   [sql] Otimização do tratamento de erro de conversão

# 2.0.15

Atualização do investira.sdk

# 2.0.16

-   [daoTxt] Novo dao para leitura dinâmica de arquivos texto

# 2.0.17

-   [daoTxt] Inclusão de metódos para leitura de atributos

# 2.0.18

-   [daoTxt] Inclusão do metódo <code>modified</code>
-   [logs] Verificação de message existe
