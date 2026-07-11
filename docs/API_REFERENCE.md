# API Reference

Esta referencia cobre a API publica exposta por `require('investira.server.sdk')`.
Os nomes abaixo seguem os exports atuais do pacote.

## Sumario

- [Entrada principal](#entrada-principal)
- [passwords](#passwords)
- [sqls](#sqls)
- [tokens](#tokens)
- [files](#files)
- [systems](#systems)
- [logs e log](#logs-e-log)
- [crypts](#crypts)
- [emailSender](#emailsender)
- [dao e daoView](#dao-e-daoview)
- [crud](#crud)
- [transactionWrapper](#transactionwrapper)
- [mySqlServer](#mysqlserver)
- [httpCors](#httpcors)
- [hostsCheckPoint](#hostscheckpoint)
- [oauth2Token](#oauth2token)
- [endpointResponse](#endpointresponse)
- [authorization](#authorization)
- [requestContext](#requestcontext)
- [sse](#sse)
- [AWS services](#aws-services)
- [Globais e efeitos colaterais](#globais-e-efeitos-colaterais)

## Entrada principal

```js
const serverSdk = require('investira.server.sdk');
```

Exports:

```js
serverSdk.passwords
serverSdk.sqls
serverSdk.tokens
serverSdk.files
serverSdk.systems
serverSdk.logs
serverSdk.crypts
serverSdk.emailSender
serverSdk.dao
serverSdk.daoView
serverSdk.daoTxt
serverSdk.DAO_ACTION_TYPE
serverSdk.crud
serverSdk.CRUD_ACTION_TYPE
serverSdk.transactionWrapper
serverSdk.mySqlServer
serverSdk.httpCors
serverSdk.hostsCheckPoint
serverSdk.oauth2Token
serverSdk.endpointResponse
serverSdk.authorization
serverSdk.requestContext
serverSdk.sse
serverSdk.sqsService
serverSdk.snsService
serverSdk.s3Service
serverSdk.log
```

## passwords

Wrapper pequeno sobre `bcrypt`.

### Metodos

- `encryptPassword(pPassword)`: gera hash bcrypt.
- `checkPassword(pPassword, pHash)`: compara senha em texto puro com hash.

### Quando usar

- cadastro de usuario;
- troca de senha;
- validacao de credencial persistida.

## sqls

Camada utilitaria para metadata, composicao de SQL e execucao de queries.
E a base usada pelos DAOs.

### Metodos publicos

- `getSqlSelect(pCN, pMetadata, pConditions, pColumns, pClauses)`: monta `SELECT`.
- `getSqlInsert(pCN, pMetadata, pDataObject, pOptions)`: monta `INSERT`.
- `getSqlUpdate(pCN, pMetadata, pDataObject, pConditions, pClauses)`: monta `UPDATE`.
- `getSqlDelete(pCN, pMetadata, pConditions, pClauses)`: monta `DELETE`.
- `getSql(...)`: resolvedor generico de SQL a partir de metadata e operacao.
- `execute(pCN, pSql)`: executa query.
- `executeSql(pCN, pSql)`: executa SQL montado pelo proprio modulo.
- `setVariable(pCN, pKey, pValue)`: define variavel SQL de sessao, tipicamente `@alguma_coisa`.
- `createMetadata(pTableName, pTableModel)`: normaliza o model de tabela para o formato consumido internamente.
- `getSQLErrorClass(pErr)`: tenta mapear erro SQL para classe de erro do ecossistema Investira.
- `convertToJS(pMetadata, pRow, pClauses)`: converte retorno do banco para valores JS conforme metadata.
- `setSavepoint(pCN, pName)`: cria savepoint.
- `rollbackTo(pCN, pName)`: faz rollback ate savepoint.
- `getWarnings(pCN)`: recupera warnings da ultima execucao.
- `closeConnection(pCN)`: encerra ou libera conexao.
- `addSortColumns(pMetadata, pColumns, pClauses)`: adiciona colunas auxiliares de ordenacao.

### Tipos de coluna e operacoes relevantes

O metadata consumido pelo modulo trabalha com informacoes como:

- chave primaria;
- autoincremento;
- tipo logico da coluna;
- mapeamento de formula;
- conversao JS/SQL.

Os filtros aceitam operadores como:

- `=`
- `<`
- `>`
- `>=`
- `<=`
- `!=`
- `<>`
- `&`
- `|`
- `!&`
- `&=`
- `IN`
- `NOT IN`
- `LIKE`
- `NOT LIKE`
- `IN LIKE`
- `NOT IN LIKE`
- `BETWEEN`

### Observacoes

- `sqls` nao e um ORM.
- O modulo depende fortemente de models bem definidos.
- `convertToJS` e importante quando houver colunas booleanas, arrays, objetos, datas ou campos criptografados.

## tokens

Geracao de tokens e hashes utilitarios.

### Metodos

- `createRandomToken(pLength)`: token aleatorio em hexadecimal.
- `createToken(pValue, pSalt, pIterations, pKeylen)`: derivacao via PBKDF2 SHA-512.
- `createToken256(pValue)`: hash SHA-256.

### Quando usar

- reset de senha;
- token de confirmacao;
- chave derivada de valor de negocio.

## files

Modulo utilitario de filesystem, download e parse.

### Constantes

- `ENCODES`
- `projectPath`
- `sep`

### Metodos

- `isDir(pPath)`
- `isFile(pPath)`
- `exists(pPath)`
- `mkDir(pPath)`
- `rmDir(pPath)`
- `readDir(pPath, pOptions)`
- `rename(pOrigin, pDestination)`
- `remove(pPath)`
- `download(pUrl, pFileName, pOptions)`: suporta cenarios HTTP e FTP.
- `unzip(pFileName, pTargetDir, pOptions)`
- `readFile(pFileName, pOptions)`: leitura de texto e alguns formatos especiais usados no projeto.
- `parseXML(pSource, pOptions)`
- `fileExt(pFileName)`
- `stat(pPath)`
- `removeSpacesFromFile(pFileName, pReplace = '_')`

### Casos de uso comuns

- baixar arquivo de integracao externa;
- abrir XML para parse em objeto JS;
- preparar lote local antes de upload em nuvem;
- higienizar nomes de arquivos.

## systems

Utilitarios de diagnostico do ambiente local.

### Metodos

- `info()`: retorna informacoes de SO, processo e host.
- `localIPs()`: lista IPs locais disponiveis.

## logs e log

O SDK expoe duas entradas relacionadas a logging:

- `logs`: fabrica configuravel de loggers;
- `log`: fabrica do logger padrao do pacote.

### `logs(pOptions)`

Cria logger baseado em `winston`, com suporte a:

- niveis customizados;
- console transport;
- file transport;
- rotacao diaria;
- supressao condicional de log por request context.

Uso tipico:

```js
const { logs } = require('investira.server.sdk');

const xLogger = logs({
    name: 'api-clientes',
    level: 'info',
    console: true
});
```

### `log()`

Retorna o logger padrao usado pelo proprio SDK.
Esse e o logger que abastece `global.gLog`.

### Niveis relevantes

- `emerg`
- `error`
- `warn`
- `note`
- `info`
- `debug`
- `verbose`
- `silly`

## crypts

Criptografia simetrica e hash simples.

### Metodos

- `encrypt(pText, pSecret)`: AES-256-CBC.
- `decrypt(pCipherText, pSecret)`: reverso do `encrypt`.
- `simpleUniqueHash(pValue)`: hash simples para identificacao estavel.

### Observacoes

- use segredo consistente entre encrypt e decrypt;
- `simpleUniqueHash` nao substitui hash criptografico para senha.

## emailSender

Helper orientado a envio de email com `nodemailer`.

### Assinatura

```js
const xMailer = new emailSender(pServerOptions);
```

### Metodos

- `options()`: retorna as opcoes efetivas do transporte.
- `send(pEmail)`: envia email.

### `pEmail`

O payload aceita os campos usuais do `nodemailer`, com tratamento interno de:

- `from`
- `to`
- `cc`
- `bcc`
- `replyTo`
- `subject`
- `text`
- `html`
- `attachments`
- `priority`

### Comportamentos uteis

- normaliza campos de endereco;
- sanitiza nome do remetente;
- converte prioridade para os formatos aceitos pelo transporte;
- devolve resultado de sucesso mais amigavel para a aplicacao.

## dao e daoView

Camada de acesso a dados orientada a metadata de tabela.

### Enums

`DAO_ACTION_TYPE` expoe:

- `READ = 9`
- `ADD = 10`
- `MODIFY = 18`
- `REMOVE = 34`
- `MERGE = 26`

### `dao(pTableName, pTableModel, pSource = {})`

Cria DAO com leitura e escrita.

### `daoView(pTableName, pTableModel, pSource = {})`

Cria DAO somente leitura, reutilizando a mesma base de metadata e validacao.

### Metodos base

- `metadata`: metadata criada por `sqls.createMetadata`.
- `validate(pTYPE, pDataObject, pConditions)`: chama `onValidate`.
- `readOne(pCN, pConditions, pColumns, pClauses)`
- `read(pCN, pConditions, pColumns, pClauses)`

### Metodos adicionais do `dao`

- `add(pCN, pDataObject, pOptions)`
- `removeOne(pCN, pConditions, pClauses)`
- `remove(pCN, pConditions, pClauses)`
- `modify(pCN, pDataObject, pConditions, pClauses)`
- `merge(pCN, pDataObject, pConditions, pClauses)`
- `modifyOne(pCN, pDataObject, pConditions, pOptions)`

### `pSource`

O objeto fonte pode sobrescrever pelo menos:

- `onValidate(pAction, pDataObject, pConditions)`

### Clauses e comportamentos importantes

- `limit`
- `offset`
- `sort`
- `returnRowsCount`
- `ignoreDuplicated`
- `currentDataObject`
- `onDiff`

### Observacoes

- `modifyOne` pode evitar update desnecessario quando recebe `currentDataObject`.
- `merge` tenta inserir primeiro e, em caso de duplicidade ignorada, faz `modify`.
- atributos fora do model tendem a ser ignorados, salvo casos especiais de coluna `object`.

## crud

Abstracao para regra de negocio em cima de um ou mais DAOs.

### Enums

`CRUD_ACTION_TYPE` expoe:

- `READ`
- `ADD`
- `MODIFY`
- `REMOVE`
- `MERGE`

### Assinatura

```js
const xCrud = new crud(pSource);
```

### Metodos publicos

- `validate(pTYPE, pDataObject, pConditions)`
- `readOne(pCN, pConditions, pColumns, pClauses)`
- `read(pCN, pConditions, pColumns, pClauses)`
- `add(pCN, pDataObject, pOptions)`
- `removeOne(pCN, pConditions, pClauses)`
- `remove(pCN, pConditions, pClauses)`
- `modify(pCN, pDataObject, pConditions, pClauses)`
- `merge(pCN, pDataObject, pConditions, pClauses)`
- `modifyOne(pCN, pDataObject, pConditions, pOptions)`

### Hooks esperados em `pSource`

- `onValidate`
- `onReadOne`
- `onRead`
- `onAdd`
- `onRemoveOne`
- `onRemove`
- `onModify`
- `onModifyOne`
- `onMerge`

### Quando usar

- casos de uso que combinam varias tabelas;
- validacao de negocio acima do DAO;
- servicos que precisam manter API uniforme de CRUD.

## transactionWrapper

Wrapper transacional para executar um bloco protegido com commit e rollback.

### Assinatura conceitual

```js
transactionWrapper(pCN, pCallback, pOptions)
```

### Papel do modulo

- iniciar ou reaproveitar transacao;
- opcionalmente usar savepoint;
- fazer rollback em caso de erro;
- devolver o resultado do callback quando tudo der certo.

### Quando usar

- operacoes compostas entre varios DAOs;
- fluxo que precisa rollback parcial com savepoint.

## mySqlServer

Wrapper de `mysql2/promise` com pool, retry e controle de transacao.

### Assinatura

```js
const xDBServer = new mySqlServer(pOptions);
```

### Metodos

- `getConnection()`
- `getConnectionPool()`
- `retry()`
- `closeConnectionPool()`
- `closeConnection(pCN)`
- `startTransaction(pCN)`
- `endTransaction(pCN, pCommit)`

### Responsabilidades

- abrir pool lazy;
- reabrir pool apos falha;
- limitar tentativas de reconexao;
- encapsular `beginTransaction`, `commit` e `rollback`.

## httpCors

Middleware de CORS.

### Assinatura

```js
const xCors = httpCors(pOptions);
```

### Comportamento

- configura headers CORS;
- responde `OPTIONS` com `204`;
- aceita customizacao de cabecalhos e origens conforme opcoes recebidas.

## hostsCheckPoint

Middleware de whitelist e blacklist por host.

### Assinatura

```js
const xCheckpoint = hostsCheckPoint(pOptions);
```

### Comportamentos relevantes

- possui whitelist padrao voltada a localhost;
- rejeita requisicoes fora da politica configurada;
- costuma ser usado antes dos endpoints sensiveis ou internos.

## oauth2Token

Middleware ou fabrica para emissao de token OAuth2.

### Assinatura

```js
const xOAuth2 = oauth2Token(pOptions);
```

### Grants previstos pelo modulo

- `clientCredentials`
- `password`
- `refreshToken`
- `authorizationCode`
- `userCredentials`

### Como pensar o contrato

O modulo fornece o esqueleto do fluxo OAuth2.
As regras concretas de autenticacao, autorizacao e montagem do token devem ser implementadas na integracao.

## endpointResponse

Padronizador de resposta HTTP para sucesso e erro.

### Assinatura

```js
const [xSuccessMiddleware, xErrorMiddleware] = endpointResponse(pOptions);
```

### Papel do modulo

- serializar `res.locals.data`;
- serializar `message`, `metadata`, `pages` e `includes`;
- traduzir erros para payload consistente;
- encerrar transacao quando `res.locals.endTransaction` existir;
- harmonizar status HTTP.

### Shape de sucesso esperado

```js
{
    data: ...,
    metadata: ...,
    pages: ...,
    includes: ...,
    message: ...
}
```

### Shape de erro esperado

```js
{
    error: {
        message: ...,
        code: ...
    }
}
```

## authorization

Middleware para interpretar cabecalho `Authorization`.

### Assinatura

```js
const xAuthorization = authorization(pValidate);
```

### Comportamento

- interpreta `Bearer` e `Basic`;
- popula `req.authInfo`;
- delega a validacao efetiva para callback recebido.

### Uso tipico

- JWT ou token opaco;
- autenticacao basica entre servicos;
- centralizacao de parse do header antes da regra de negocio.

## requestContext

Contexto por request baseado em `async_hooks`.

### Assinatura

```js
const xRC = new requestContext(pDBServer, pDDOSOptions);
```

### Metodos

- `getCount()`
- `getDBServer()`
- `set(pKey, pValue)`
- `get(pKey)`
- `getContextData()`
- `hasContext()`
- `getId()`
- `childrenCount()`
- `create()`
- `enable()`
- `disable()`
- `middleware()`

### O que ele faz

- cria contexto assicrono compartilhado por toda a arvore de execucao do request;
- abre conexao DB por request quando `pDBServer` e informado;
- inicia transacao no inicio do request;
- fecha ou libera conexao no `onFinished`;
- registra metadados de IP e flags de log/conexao;
- inclui monitoramento simples de DDOS por contagem de host.

### Chaves recorrentes no contexto

- `reqId`
- `cn`
- `disable_log`
- `disable_connection`

### Observacao importante

O modulo e central para o funcionamento de outros componentes do SDK, principalmente:

- `endpointResponse`
- `logs`
- DAOs que usam `gLog`

## sse

Helper leve para Server-Sent Events.

### Assinatura

```js
const xSse = new sse();
```

### Metodos

- `count()`: quantidade de clientes conectados.
- `broadcast(pData)`: envia payload para todos os clientes.
- `close()`: encerra conexoes abertas.
- `middleWare()`: middleware que registra o cliente SSE.

## AWS services

### `s3Service(pOptions)`

Wrapper do AWS SDK v3 para operacoes comuns em S3.

#### Metodos

- `uploadFile(pLocalFile, pRemoteBucket, pRemoteFolder = '', pOptions = {})`
- `readFile(pFileKey, pRemoteBucket, pRemoteFolder = '')`
- `streamFile(pFileKey, pRemoteBucket, pRemoteFolder = '')`
- `uploadDir(pLocalDir, pRemoteBucket, pBaseDir = null)`
- `deleteDir(pRemoteBucket, pRemoteDir)`
- `copyFileToAnotherBucket(pOrigin, pDestinationBucket)`
- `exists(pFile)`

### `snsService(pOptions)`

Wrapper de SNS.

#### Metodos

- `createTopic(pParams = {})`
- `getTopicAttributesUsingTopicName(pTopicName)`
- `deleteTopic(pTopicArn = '')`
- `getTopicAttributes(pTopicArn = '')`
- `listTopics()`
- `publish(pParams)`
- `subscribe(pParams)`
- `confirmSubscription(pParams)`

### `sqsService(pOptions)`

Wrapper de SQS.

#### Metodos

- `createQueue(pParams = {})`
- `getQueueAttributes(pQueueUrl)`
- `getQueueUrl(pParams)`
- `publish(pParams)`: hoje retorna rejeicao explicita para operacao nao suportada.
- `receiveMessage(pParams)`
- `deleteMessage(pParams)`

## daoTxt

Leitor de arquivo texto orientado a navegacao por linha.

### Assinatura

```js
const xDaoTxt = new daoTxt(pOptions);
```

### Metodos

- `linesCount()`
- `currentLine()`
- `filename()`
- `filesize()`
- `modified()`
- `open(pFileName)`
- `readFromStart(pLines)`
- `readNext(pLines)`
- `readPrevious(pLines)`
- `readFromEnd(pLines)`
- `readCurrent()`
- `readInterval(pLineStart, pLineEnd)`
- `readFrom(pPosition, pLines)`

### Quando usar

- tail e leitura parcial de logs;
- navegacao em arquivos muito grandes;
- inspecao por janela de linhas.

## Globais e efeitos colaterais

### `global.gLog`

Criado automaticamente no `require('investira.server.sdk')`.

### `gRC`

Existe declaracao de tipo global para `gRC`, mas o entry point nao inicializa `global.gRC` automaticamente.
O consumo mais seguro e manter a instancia de `requestContext` em variavel local da aplicacao.
