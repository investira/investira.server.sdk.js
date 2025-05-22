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
-   [logs] Utilização do stringify no log

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

# 2.0.19

-   [daoTxt] Correção da tamanho da linha

# 2.0.20

-   [endpointResponse] Verificação de página em relação ao total
-   [daoTxt] Sincronização antes linescount
-   [daoTxt] Resincronização a partir da data de alteração
-   [daoTxt] lineCount retorna Promise

# 2.0.21

-   [endpointResponse] Criação dos link de paginação a partir da query

# 2.0.22

-   [sqls] Clauses com opção DISCTINCT

# 2.0.23

-   [endpointResponse] Correção dos links da paginação

# 2.1.0

-   [bcrypt] Atualização do pacote

# 2.1.1

-   [winston] Atualização do pacote
-   [pug] Atualização do pacote
-   [nodemailer] Atualização do pacote

# 2.1.2

-   [sqls] Otimização para update de colunas json

# 2.1.3

-   [sqls] Correção para update de colunas json

# 2.1.4

-   [sqls] Correção para update de colunas json

# 2.1.5

-   [sqls] Atualização do driver para o Mysql

# 2.2.0

-   [dao] Correção do remove

# 2.2.2

-   [endpointResponse] Exclusão do offset

# 2.2.3

-   [endpointResponse] Correção de parâmetros invertidos nos links de paginação

# 2.2.4

-   [authorization] Retorno de UnauthorizedError

# 2.2.5

-   [endpointResponse] <code>limit.page</code> definido como 1 por padrão (valores menores que 1 não retornam links de paginação)
-   [endpointResponse] Verificação com <code>hasOwnProperty</code> e remoção de verificações redundantes
-   [sqls] Utilização de <code>deepCopy</code> para não alterar o objeto <code>clauses.limit</code> original do request

# 2.2.6

-   [sqls] Correção para testar <code>clauses</code> = null

# 2.2.7

-   [sqls] Correção do order by e group by

# 2.2.8

-   [investira.sdk] Atualização

# 2.2.9

-   [investira.sdk] Atualização

# 2.2.10

-   [investira.sdk] Atualização

# 2.2.11

-   [investira.sdk] Atualização

# 2.2.12

-   [endpointResponse] Correção no cálculo de página

# 2.2.13

-   [mySqlServer] Exibição do log somente com process.env.NODE_ENV = 'development'

# 2.2.14

-   [pug] Atualização do pug

# 2.2.15

-   [investira.sdk] Atualização

# 2.2.16

-   [investira.sdk] Atualização

# 2.2.17

-   [investira.sdk] Atualização

# 2.2.17

-   [requestContext] Retirada do object.freeze

# 2.2.18

-   [requestContext] Reseta contador do total de request

# 2.2.19

-   [bcrypt] Atualização de versão

# 2.2.20

-   [file] Novas opções para leitura de arquivo XML

# 2.2.21

-   [nodemailer] Atualização de versão

# 2.2.22

-   [endpointResponse] Verificação dos atributos por hasOwnProperty

# 2.2.23

-   [endpointResponse] Exibição do log completo quando houver erro

# 2.2.24

-   atualização do investira.sdk

# 2.2.25

-   [endpointResponse] Interrompe response quando request for cancelado

# 2.2.26

-   [requestContext] Substituição do throw por log.

# 2.3.0

-   [@mysql/xdevapi] Atualização
-   [@types/node] Atualização

# 2.3.1

-   atualização do investira.sdk

# 2.3.2

-   atualização do investira.sdk

# 2.3.3

-   atualização do investira.sdk

# 2.3.4

-   atualização do investira.sdk

# 2.3.5

-   atualização do investira.sdk

# 2.3.6

-   atualização do investira.sdk

# 2.3.7

-   [files] Download configurado com rejectUnauthorized = false

# 2.3.8

-   atualização do investira.sdk

# 2.3.9

-   atualização do investira.sdk

# 2.3.10

-   atualização do investira.sdk

# 2.3.11

-   atualização do investira.sdk

# 2.3.12

-   atualização do investira.sdk
-   [bcyrpt] audit fix

# 2.4.0

-   [investira.sdk] Atualização
-   [snsService] Serviço SNS da AWS
-   [sqsService] Serviço SQS da AWS

# 2.4.1

-   [snsService] Atualização
-   [sqsService] Atualização

# 2.4.2

-   [sql] Inclusão da cláusula 'having'

# 2.4.3

-   [sql] Correção do 'having'

# 2.4.4

-   [nodemailer] Atualizado para 6.7.7
-   [aws-sdk] Atualizado para 2.1169.0
-   [investira.sdk] Atualizado

# 2.4.5

-   [sqls] Nova função <code>execute</code>

# 2.4.6

-   [xlsx] Atualizado
-   [investira.data] Atualizado

# 2.4.7

-   [investira.sdk] Atualizado

# 2.4.8

-   [investira.sdk] Atualizado

# 2.4.9

-   [investira.sdk] Atualizado

# 2.4.10

-   [investira.sdk] Atualizado

# 2.4.11

-   [sqls] Inclusão do atributo 'lock' nas cláusulas
-   [dao] Inclusão do atributo 'lock' nas cláusulas

# 2.4.12

-   [sqls] Correção do espaço entre as cláusulas

# 2.4.13

-   Republish

# 2.4.14

-   [dao] Correção do teste do parametro das colunas.

# 2.4.15

-   [dao] Correção do teste do parametro das colunas.

# 2.4.16

-   [dao] Substituição do atributo pLimit por pClauses
-   [sqls] Teste de deadlocks para todos os comandos

# 2.4.17

-   [@mysql/xdevapi] atualizado 8.0.23 -> 8.0.31
-   [winston] atualizado 3.3.3 -> 3.8.2

# 2.4.18

-   [s3] S3 services

# 2.5.0

-   [nodejs] Atualização para node 18.12

# 2.5.1

-   [mysql] Substituição da lib mysqlxdev por mysql2

# 2.5.2

-   [sqls] Teste de deadlock

# 2.5.3

-   [sqls] Correção do read 'count(\*)'

# 2.5.4

-   [requestContext] Retirada do Schema

# 2.5.5

-   [dao] Correção do read 'count(\*)'

# 2.5.6

-   [dao] Correção do read 'count(\*)'

# 2.5.7

-   [sql] Alteração de forma de tratar Where com coluna de valor NULL

# 2.5.8

-   [sql] Trabamento do Resolve do sqlExecute

# 2.5.9

-   [mySqlServer] Configuração para retornar colunas DECIMAL como número

# 2.5.10

-   Alteração da versão do Node

# 2.5.11

-   [sql] Closeconnection com release

# 2.5.12

-   [crud] Inclusão de Clauses no readOne

# 2.5.13

-   [mysql2] Atualização de dependência

# 2.5.14

-   Atualização de dependências

# 2.5.16

-   [crypts] Liblioteca para cyptografia 256
-   [sqls] Novo tipo de colua 'encrypted'

# 2.5.17

-   [dao] Correção do merge e modify
-   [dao] Novo atributo returnRowsCount no modify para retornar a quantidade de linhas encontrada e alteradas

# 2.5.18

-   [dao] Otimização do modify modify

# 2.5.20

-   [files] Função pvReadFileXML força Conversão para objeto, pois o xml2js retorna um 'objeto'não de derivado de 'objects'

# 2.5.21

-   Atualização de dependências

# 2.5.22

-   Atualização de dependências

# 2.5.23

-   [sql] Força que limit seja numérico

# 2.5.24

-   Atualização de dependências

# 2.5.25

-   Atualização de dependências

# 2.5.26

-   Atualização de dependências

# 2.5.27

-   Atualização de dependências

# 2.5.28

-   Atualização de dependências

# 2.6.0

-   Atualização de dependências
-   [sql] Novo tipo de coluna 'array'

# 2.6.1

-   Atualização de dependências

# 2.6.2

-   [files] Tratamento de erro no pvReadFileTXT

# 2.6.3

-   [s3Service] inclusao S3 da função streamFile e readFile

# 2.6.4

-   Atualização de dependências

# 2.6.5

-   Atualização de dependências

# 2.6.6

-   Atualização de dependências

# 2.6.7

-   Atualização de dependências

# 2.6.8

-   [httpCors] Inclusão do atributo <code>Access-Control-Expose-Headers:Content-Disposition</code>

# 2.6.9

-   [files] <code>readFile</code> - Correção na leitura de xls

# 2.6.10

-   [dao] Correção do <code>modifyOne</code>

# 2.6.11

-   [dao] Correção do <code>modifyOne</code>

# 2.6.12

-   Atualização de dependências

# 2.6.13

-   [dao] Correção para resetar variável de ambiente após o uso
-   [sql] Correção para resetar variável de ambiente após o uso

# 2.6.14

-   Atualização de dependências

# 2.6.15

-   [files] downloadHttp POST com body json

# 2.6.16

-   [files] downloadHttp correção do content-type

# 2.6.17

-   [sqls] ExecuteSql - Tratamento do erro para incluir mais informação

# 2.6.18

-   [sqls] ConvertValueExecuteSql - Correção do null como string('null')

# 2.6.19

-   [mySqlServer] Inclusão do atributo <code>infileStreamFactory</code> para set utilizado nos LOAD DATA INFILE

# 2.6.20

-   [sql] Inclusão do condições complexas utilizando MATCH, IN de coluna, OR e AND.

# 2.6.21

-   [sql] Inclui colunas do match no order by e inclui coluna do racking no select

# 2.6.22

-   [sql] Tratamento de count(\*) com fulltext search

# 2.7.0

-   Atualização de dependências

# 2.7.1

-   [dao] Correção de cancelamento da query

# 2.7.2

-   [requestContext] com await no onfinish

# 2.7.3

-   [authorization] Tratamento do cancelamento

# 2.7.4

-   [dao] Teste de abort
-   [mySqlServer] Teste de abort e destroy
-   [endpointResponse] Teste de abort
-   [requestContext] Teste de abort
-   [sqls] Teste de abort e destroy
-   [sqlsxdev] Teste de abort

# 2.7.5

-   [requestContext] Fecha conexão no abort

# 2.7.6

-   [sqls] Retirada de caracteres inválidos

# 2.7.10

-   [sqls] Retirada de caracteres de controle do final da string

# 2.7.11

-   [dao] Correção do SELECT_COUNT

# 2.7.14

-   [sqls] Tratamento de match sem valor

# 2.7.16

-   [requestContext] Close connection

# 2.7.17

-   [sqls] Alteração do tratamento de operadores binários

# 2.7.18

-   Atualização de dependências

# 2.7.19

-   Atualização de dependências

# 2.7.20

-   Atualização de dependências

# 2.7.21

-   Atualização de dependências

# 2.8.0

-   [sql] Refector da query complex

# 2.8.1

-   [sql] pvToSQLWhereComplex correção

# 2.8.2

-   [requestConext] Try/Catch

# 2.8.4

-   [requestConext] Close connection no abort

# 2.8.5

-   [requestConext] Retirada de logs

# 2.8.8

-   [sqls] Validação da string para Fulltext Search

# 2.8.9

-   [sqls] Correção quando 'IN' contém array vazio

# 2.8.10

-   Atualização de dependências

# 2.8.11

-   Atualização de dependências

# 2.8.12

-   Atualização de dependências

# 2.8.13

-   Atualização de dependências

# 2.8.14

-   Atualização de dependências

# 2.8.15

-   [sqls] Tratamento para coluna do tipo object

# 2.8.16

-   Atualização de dependências

# 2.8.17

-   [emailSender] bcc e cc

# 2.8.18

-   Atualização de dependências

# 2.8.19

-   Versão do Node

# 2.8.20

-   Atualização de dependências

# 2.8.21

-   Atualização de dependências

# 2.8.22

-   Atualização de dependências

# 2.8.24

-   [sqls] Tratamento de array dentro de json

# 2.8.25

-   [sqls] Tratamento de array dentro de json

# 2.8.26

-   Atualização de dependências

# 2.8.27

-   [sqls] Permite retornar colunas com formulas quando nome da coluna não pertence ao dao

# 2.8.28

-   [sqls] Correção: Permite retornar colunas com formulas quando nome da coluna não pertence ao dao

# 2.8.29

-   [dao] Correção: Permite retornar colunas com formulas quando nome da coluna não pertence ao dao
-   [sqls] Correção: Permite retornar colunas com formulas quando nome da coluna não pertence ao dao

# 2.8.30

-   [sqls] Validação dos atributos do model para quando não for objeto

# 2.8.31

-   [dbserver] Log

# 2.8.32

-   [requestContext] Controle DDos alterado para subtrair ao final do request

# 2.8.33

-   Atualização de dependências

# 2.8.34

-   [files] Nova função removeSpacesFromFile

# 2.8.35

-   [sqls] Model com type 'tmp'

# 2.8.36

-   [crypts] Inclusão de simplesUniqueHash
-   [systems] Inclusão de localIPs

# 2.8.37

-   [requestContext] Exibe segundos de execução

# 2.8.38

-   [mysql2] Update
