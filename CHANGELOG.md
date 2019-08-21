# 1.0.6

-   [files] Novo módulo files, com funções 'projectPath' e 'sep'
-   [mySqlServer] Exclusão de log no commit e no rollback

# 1.0.7

-   [files] Nova função 'download'
-   [sqls] Novo operador 'in'

# 1.0.8

-   [sqls] e [daos] refactor do limit e inclusão de groupBy
-   [sqls] correção do operador 'in'

# 1.0.9

-   [sqls] correção para value da columa com type JSON

# 1.0.10

-   [sqls] Implementação para pertimir nomes reservados como nome de colunas no banco

# 1.0.11

-   [authorization] Correção: Returns nos Rejects
-   [sqls] Operador 'in': controlado também pelo bind para evitar sql inject
-   [sqls] Operador 'in': valor poder receber um array
-   [sqls] Novo operador 'like'
-   [endpointResponse] Criação automática de atributo req.clauses contendo {sort,limit:{page,offset,size}} a partir dos parametros da query

# 1.0.12

-   [files] Nova função 'read' para ler arquivos
-   [files] Nova função 'unzip' para descompactar arquivos
-   [files] Nova função 'mkdir' para criar pasta se não existir
-   [files] Nova função 'rename' para renomear arquivo e pastas

# 1.1.0

-   [sqls] Controle de Datamodel com atributos sendo objetos dentro de objetos
-   [files] 'read' controlando quebra de linha por parametro
-   [sqls] e [dao] Campos 'json' com validação e conversão conforme model e possibilidade de pesquisa por atributo

# 1.1.1

-   [sqls] Otimização do tratamento de condições
-   [sqls] Inclusão de operador 'BETWEEN'

# 1.1.2

-   [sqls] Correção - pvModelCompliance

# 1.1.3

-   [daos] Source com valor default

# 1.1.4

-   [daos] Correção do dao

# 1.1.5

-   [daos] Exibição da query quando houver erro
-   [daos] Bug: Não estava retornando coluna com valor zero

# 1.2.0

-   [daos] Conversão de array de json para array de object
-   [files] Nova função 'readDir'. Retornar lista de arquivos de uma pasta
-   [files] Nova função 'isDir'. Retorna se arquivo é um diretório
-   [files] Nova função 'isFile'. Retorna se é realmente um arquivo
-   [files] Nova função 'remove'. Remover arquivo localmente
-   [files] unzip retorna lista dos arquivos descompactados
-   [sqls] Tentativa automÁtica se novo insert após 'Deadlock'
-   [files] retirada catch do 'download' para que seja tradado pelo chamador
-   [sqls] Opção de 'Select' para não retornar nenhuma coluna
-   [sqls] Correção quando valor do campo é 'undefined'
-   [sqls] Bloqueio de update quando não houver critério definido
-   [sqls] Bloqueio de select quando colunas no cretério não fizerem parte do tableModel
-   [sqls] Novo tipo de dado 'datetime'. tipo 'date' somente armazenará data sem a hora
-   [sqls] Novo operador 'NOT IN'
-   [sqls] Operadoradores 'IN' e 'NOT IN' passa a aceitar null como valor válido da lista
-   [sqls] Valor para operadorador 'BETWEEN' pode ser informado como String, Array ou parametro extra

# 1.2.1

-   [sqls] Correção da leitura de dados do banco quando for do date ou datetime

# 1.2.2

-   [sqls] Correção de bug MYSQL que arredonda JS number. Artifício foi converter number para string antes de salvar.
-   [files] Implementação de 'download' por FTP.
-   [files] Implementação de 'readFile' para arquivos 'Excel'
