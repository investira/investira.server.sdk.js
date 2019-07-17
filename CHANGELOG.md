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

# 1.0.13

-   [sqls] Controle de Datamodel com atributos sendo objetos dentro de objetos
-   [files] 'read' controlando quebra por CRLF
