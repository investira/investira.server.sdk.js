const path = require('path');
const util = require('util');
const { Readable } = require('stream');
const { Upload } = require('@aws-sdk/lib-storage');
const {
    S3Client,
    GetObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    DeleteObjectsCommand,
    CopyObjectCommand
} = require('@aws-sdk/client-s3');
const { isEmpty } = require('investira.sdk').validators;

const fs = require('fs');
const { readDir, isDir } = require('../utils/files');
// @ts-ignore
const { BadRequestError } = require('investira.sdk').messages.ClientErrors;

const AWS_DEFAULT_REGION = 'sa-east-1';
const AWS_DEFAULT_API_VERSION = '2010-03-31';
const FILE_CONTENT_TYPES = {
    '.csv': 'text/csv',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.gif': 'image/gif',
    '.htm': 'text/html',
    '.html': 'text/html',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.json': 'application/json',
    '.ljson': 'application/x-ndjson',
    '.md': 'text/markdown',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain',
    '.avi': 'video/x-msvideo',
    '.m4v': 'video/mp4',
    '.mkv': 'video/x-matroska',
    '.mov': 'video/quicktime',
    '.mp4': 'video/mp4',
    '.mpeg': 'video/mpeg',
    '.mpg': 'video/mpeg',
    '.webm': 'video/webm',
    '.webp': 'image/webp',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xml': 'application/xml',
    '.zip': 'application/zip'
};
const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

/**
 * Wrapper de integração com o Amazon S3 usado pelos projetos da Investira.
 *
 * A ideia desta função é manter uma interface estável para operações comuns de
 * upload, leitura, stream, cópia, exclusão por diretório e verificação de
 * existência, encapsulando a configuração do cliente da AWS SDK v3.
 *
 * @param {object} [pOptions={}] Opções de configuração do cliente S3
 * @param {?string} [pOptions.accessKeyId=null] Access key explícita
 * @param {?string} [pOptions.secretAccessKey=null] Secret key explícita
 * @param {string} [pOptions.region='sa-east-1'] Região do bucket
 * @param {string} [pOptions.apiVersion='2010-03-31'] Versão lógica mantida por compatibilidade
 */
const s3Service = function (pOptions = {}) {
    const xOptions = {
        accessKeyId: null,
        secretAccessKey: null,
        region: AWS_DEFAULT_REGION, //Região padrão
        apiVersion: AWS_DEFAULT_API_VERSION, //Versão padrão
        ...pOptions //Sobrescreve os valores padrão
    };
    this.s3 = new S3Client(pvGetS3Config(xOptions));

    /**
     * Faz upload de um arquivo local para o bucket remoto.
     *
     * Mantém compatibilidade com a assinatura antiga, aceitando:
     *
     * - `uploadFile(pLocalFile, pRemoteBucket, pRemoteFolder)`
     * - `uploadFile(pLocalFile, pRemoteBucket, pRemoteFolder, pOptions)`
     * - `uploadFile(pLocalFile, pRemoteBucket, pOptions)`
     *
     * Quando `contentType` não é informado explicitamente, o método tenta
     * inferi-lo pela extensão do arquivo e, se não conseguir, utiliza
     * `application/octet-stream`.
     *
     * @param {string} pLocalFile Caminho completo do arquivo local
     * @param {string} pRemoteBucket Nome do bucket remoto
     * @param {string|object} [pRemoteFolder=''] Pasta remota ou objeto de opções
     * @param {object} [pOptions={}] Opções adicionais do upload
     * @param {string} [pOptions.remoteFolder=''] Pasta remota do arquivo
     * @param {string} [pOptions.contentType] Content type explícito a ser enviado ao S3
     * @return {Promise<object>} Resposta normalizada do upload
     */
    this.uploadFile = (pLocalFile, pRemoteBucket, pRemoteFolder = '', pOptions = {}) => {
        const xUploadOptions = pvResolveUploadOptions(pRemoteFolder, pOptions);
        pRemoteFolder = xUploadOptions.remoteFolder;
        if (!pLocalFile) {
            return Promise.reject(new BadRequestError('Source file não informada.'));
        }
        if (!pRemoteBucket) {
            return Promise.reject(new BadRequestError('Remote Bucket não informada.'));
        }
        return fs.promises.readFile(pLocalFile).then(rData => {
            // Mantém a mesma composição de chave já usada pela versão anterior do serviço.
            const xParams = {
                Bucket: pRemoteBucket,
                Key: path.join(pRemoteFolder, path.basename(pLocalFile)),
                Body: rData
            };
            const xContentType = pvResolveContentType(pLocalFile, xUploadOptions);
            if (xContentType) {
                xParams.ContentType = xContentType;
            }
            // Usa upload gerenciado da v3 para preservar o comportamento do upload antigo.
            const xUpload = new Upload({
                client: this.s3,
                params: xParams
            });
            return xUpload.done().then(rDataUpload => {
                // Normaliza o retorno para manter os campos esperados pelos consumidores atuais.
                return pvNormalizeUploadResult(rDataUpload, xOptions.region, xParams);
            });
        }).catch(rErr => {
            // Registra os parâmetros equivalentes ao objeto remoto para facilitar diagnóstico.
            console.log(util.inspect(pvBuildObjectParams(pLocalFile, pRemoteBucket, pRemoteFolder)));
            return Promise.reject(rErr);
        });
    };
    /**
     * Recupera o objeto remoto do S3.
     *
     * O retorno preserva o contrato bruto do `GetObjectCommand`, permitindo ao
     * consumidor acessar metadados e o body conforme necessário.
     *
     * @param {string} pFileKey Nome do arquivo ou chave base do objeto
     * @param {string} pRemoteBucket Nome do bucket remoto
     * @param {string} [pRemoteFolder=''] Pasta remota opcional
     * @return {Promise<object>} Resposta do `GetObjectCommand`
     */
    this.readFile = (pFileKey, pRemoteBucket, pRemoteFolder = '') => {
        const xParams = pvBuildObjectParams(pFileKey, pRemoteBucket, pRemoteFolder);
        return this.s3.send(new GetObjectCommand(xParams));
    };
    /**
     * Obtém um stream Node.js de um arquivo armazenado no S3.
     *
     * Antes de abrir o stream, a função valida a existência do objeto para
     * manter o comportamento legado de erro mais previsível.
     *
     * @param {string} pFileKey Nome do arquivo ou chave base do objeto
     * @param {string} pRemoteBucket Nome do bucket remoto
     * @param {string} [pRemoteFolder=''] Pasta remota opcional
     * @return {Promise<Readable>} Stream compatível com Node.js
     */
    this.streamFile = (pFileKey, pRemoteBucket, pRemoteFolder = '') => {
        const xParams = pvBuildObjectParams(pFileKey, pRemoteBucket, pRemoteFolder);
        return this.s3.send(new HeadObjectCommand(xParams)).then(() => {
            // Primeiro confirma existência do objeto para manter o fluxo de erro compatível.
            return this.s3.send(new GetObjectCommand(xParams)).then(rData => {
                // Converte o body retornado pela v3 para stream Node.js quando necessário.
                return pvGetBodyStream(rData.Body);
            });
        });
    };
    /**
     * Faz upload recursivo de um diretório local inteiro.
     *
     * Arquivos ocultos continuam sendo ignorados para manter compatibilidade com
     * o comportamento anterior do serviço.
     *
     * @param {string} pLocalDir Diretório local de origem
     * @param {string} pRemoteBucket Nome do bucket remoto
     * @param {?string} [pBaseDir=null] Diretório base remoto
     * @return {Promise}
     */
    this.uploadDir = (pLocalDir, pRemoteBucket, pBaseDir = null) => {
        if (!isDir(pLocalDir)) {
            return Promise.reject(`${pLocalDir} não é um diretório.`);
        }
        if (!pBaseDir) {
            pBaseDir = path.basename(pLocalDir);
        }
        return readDir(pLocalDir).then(rEntries => {
            if (!rEntries || rEntries.length === 0) {
                return Promise.reject(`Invalid or empty folder ${pLocalDir}`);
            }
            return pvUploadDirEntries(this, pLocalDir, pRemoteBucket, pBaseDir, rEntries);
        });
    };
    /**
     * Exclui em lote todos os objetos encontrados abaixo de um prefixo remoto.
     *
     * @param {string} pRemoteBucket Nome do bucket remoto
     * @param {string} pRemoteDir Prefixo/pasta remota a ser excluída
     * @return {Promise}
     */
    this.deleteDir = (pRemoteBucket, pRemoteDir) => {
        return this.s3
            .send(
                new ListObjectsV2Command({
                    Bucket: pRemoteBucket,
                    Prefix: pRemoteDir
                })
            )
            //@ts-ignore
            .then(rObjetosPastaPessoa => {
                if (isEmpty(rObjetosPastaPessoa.Contents)) {
                    return Promise.resolve();
                }
                // Agrupa todos os objetos encontrados para manter a exclusão em lote.
                const xDeleteParams = {
                    Bucket: pRemoteBucket,
                    Delete: { Objects: [] }
                };
                rObjetosPastaPessoa.Contents.forEach(({ Key }) => {
                    xDeleteParams.Delete.Objects.push({ Key });
                });
                return this.s3.send(new DeleteObjectsCommand(xDeleteParams));
            });
    };
    /**
     * Copia um arquivo entre localizações do S3.
     *
     * @param {string} pOrigin Caminho completo da origem no formato bucket/path/arquivo.ext
     * @param {string} pDestinationBucket Caminho completo do destino sem o nome final do arquivo
     * @return {Promise<object>} Resposta do `CopyObjectCommand`
     */
    this.copyFileToAnotherBucket = (pOrigin, pDestinationBucket) => {
        const xParams = {
            Bucket: pDestinationBucket,
            CopySource: pOrigin
        };
        xParams.Key = path.basename(pOrigin);
        //@ts-ignore
        return this.s3.send(new CopyObjectCommand(xParams));
    };

    /**
     * Retorna se um arquivo existe no S3.
     *
     * Mantém o contrato legado devolvendo `false` quando o objeto não é
     * encontrado, em vez de propagar diretamente o erro da SDK.
     *
     * @param {string} pFile Caminho completo do arquivo no formato bucket/path/arquivo.ext
     * @return {Promise<object|boolean>} Metadados do `HeadObjectCommand` ou `false`
     */
    this.exists = pFile => {
        const xFile = path.parse(pFile);
        const xParams = {
            Bucket: xFile.dir,
            Key: `${xFile.name}${xFile.ext}`
        };
        return this.s3.send(new HeadObjectCommand(xParams)).catch(_rErr => {
            // Mantém o contrato legado que devolve false quando o objeto não é encontrado.
            return false;
        });
    };

    return this;
};

module.exports = s3Service;

/**
 * Monta a configuração efetiva do cliente S3.
 *
 * Só injeta credenciais explícitas quando elas forem realmente informadas,
 * permitindo que a SDK use mecanismos padrão do ambiente quando aplicável.
 *
 * @param {object} pOptions Configuração recebida pelo construtor
 * @return {object} Configuração final do `S3Client`
 */
const pvGetS3Config = pOptions => {
    const xConfig = {
        region: pOptions.region
    };
    if (pOptions.accessKeyId !== null && pOptions.secretAccessKey !== null) {
        // Só fixa credenciais explícitas quando realmente forem informadas.
        xConfig.credentials = {
            accessKeyId: pOptions.accessKeyId,
            secretAccessKey: pOptions.secretAccessKey
        };
    }
    return xConfig;
};

/**
 * Monta o objeto padrão de `Bucket` e `Key` para operações de leitura.
 *
 * @param {string} pFileKey Nome do arquivo ou chave base do objeto
 * @param {string} pRemoteBucket Nome do bucket remoto
 * @param {string} [pRemoteFolder=''] Pasta remota opcional
 * @return {object} Estrutura padrão para comandos do S3
 */
const pvBuildObjectParams = (pFileKey, pRemoteBucket, pRemoteFolder = '') => {
    return {
        Bucket: pRemoteBucket,
        Key: path.join(pRemoteFolder, path.basename(pFileKey))
    };
};

/**
 * Normaliza a assinatura flexível do método `uploadFile`.
 *
 * Permite que o terceiro argumento seja usado tanto como pasta remota quanto
 * como objeto de opções, preservando compatibilidade com consumidores antigos.
 *
 * @param {*} pRemoteFolder Pasta remota ou objeto de opções
 * @param {object} [pOptions={}] Objeto de opções explícito
 * @return {object} Opções de upload já normalizadas
 */
const pvResolveUploadOptions = (pRemoteFolder, pOptions = {}) => {
    if (pRemoteFolder && typeof pRemoteFolder === 'object' && !Array.isArray(pRemoteFolder)) {
        return {
            remoteFolder: '',
            ...pRemoteFolder
        };
    }
    return {
        remoteFolder: pRemoteFolder || '',
        ...pOptions
    };
};

/**
 * Resolve o content type final do upload.
 *
 * A precedência adotada é:
 *
 * 1. `contentType` informado explicitamente
 * 2. inferência pela extensão do arquivo
 * 3. fallback padrão `application/octet-stream`
 *
 * @param {string} pLocalFile Caminho do arquivo local
 * @param {object} [pOptions={}] Opções do upload
 * @return {string} Content type final do upload
 */
const pvResolveContentType = (pLocalFile, pOptions = {}) => {
    if (pOptions.contentType) {
        return pOptions.contentType;
    }
    const xContentType = pvGetContentTypeFromFile(pLocalFile);
    if (xContentType) {
        return xContentType;
    }
    return DEFAULT_CONTENT_TYPE;
};

/**
 * Tenta identificar o content type pela extensão do arquivo local.
 *
 * @param {string} pLocalFile Caminho do arquivo local
 * @return {string|null} Content type identificado ou `null`
 */
const pvGetContentTypeFromFile = pLocalFile => {
    const xExt = path.extname(pLocalFile || '').toLowerCase();
    if (!xExt) {
        return null;
    }
    return FILE_CONTENT_TYPES[xExt] || null;
};

/**
 * Normaliza o retorno do upload para manter compatibilidade com consumidores
 * que já leem `Bucket`, `Key` e `Location` diretamente da resposta.
 *
 * @param {object} pUploadResult Resposta original do upload
 * @param {string} pRegion Região configurada para o cliente
 * @param {object} pParams Parâmetros usados no upload
 * @return {object} Resposta normalizada
 */
const pvNormalizeUploadResult = (pUploadResult, pRegion, pParams) => {
    const xUploadResult = {
        ...pUploadResult
    };
    // Preenche campos que alguns consumidores já leem diretamente do retorno.
    if (!xUploadResult.Bucket) {
        xUploadResult.Bucket = pParams.Bucket;
    }
    if (!xUploadResult.Key) {
        xUploadResult.Key = pParams.Key;
    }
    if (!xUploadResult.Location) {
        xUploadResult.Location = pvBuildLocation(pRegion, pParams.Bucket, pParams.Key);
    }
    return xUploadResult;
};

/**
 * Constrói a URL pública do objeto remoto de forma compatível com o retorno
 * legado esperado por consumidores já existentes.
 *
 * @param {string} pRegion Região do bucket
 * @param {string} pBucket Nome do bucket
 * @param {string} pKey Chave completa do objeto
 * @return {string} URL pública do objeto
 */
const pvBuildLocation = (pRegion, pBucket, pKey) => {
    const xRegion = pRegion || AWS_DEFAULT_REGION;
    // Codifica cada segmento separadamente para evitar quebrar as barras da chave.
    const xKey = String(pKey)
        .split('/')
        .map(rPart => {
            return encodeURIComponent(rPart);
        })
        .join('/');
    if (xRegion === 'us-east-1') {
        return `https://${pBucket}.s3.amazonaws.com/${xKey}`;
    }
    return `https://${pBucket}.s3.${xRegion}.amazonaws.com/${xKey}`;
};

/**
 * Converte o body retornado pela SDK em um stream compatível com Node.js.
 *
 * A função cobre os formatos mais comuns retornados pela AWS SDK v3:
 * stream Node.js, WebStream, Buffer, string e `Uint8Array`.
 *
 * @param {*} pBody Body retornado pelo `GetObjectCommand`
 * @return {Promise<Readable>} Stream compatível com Node.js
 */
const pvGetBodyStream = pBody => {
    if (!pBody) {
        return Promise.reject(new Error('Stream do S3 não disponível.'));
    }
    if (typeof pBody.pipe === 'function') {
        // Em ambiente Node.js a SDK normalmente já retorna um stream utilizável.
        return Promise.resolve(pBody);
    }
    if (typeof pBody.transformToWebStream === 'function' && typeof Readable.fromWeb === 'function') {
        // Faz a ponte para stream Node.js quando a SDK devolver WebStream.
        return Promise.resolve(Readable.fromWeb(pBody.transformToWebStream()));
    }
    if (Buffer.isBuffer(pBody) || typeof pBody === 'string' || pBody instanceof Uint8Array) {
        // Garante compatibilidade mesmo quando o body vier materializado em memória.
        return Promise.resolve(Readable.from([pBody]));
    }
    return Promise.reject(new Error('Não foi possível converter o retorno do S3 em stream.'));
};

/**
 * Faz o upload recursivo dos itens de um diretório, preservando a estrutura
 * relativa abaixo do diretório base informado.
 *
 * @param {object} pS3Service Instância atual do serviço S3
 * @param {string} pLocalDir Diretório local que está sendo percorrido
 * @param {string} pRemoteBucket Nome do bucket remoto
 * @param {string} pBaseDir Diretório remoto base
 * @param {string[]} pEntries Entradas encontradas no diretório atual
 * @return {Promise}
 */
const pvUploadDirEntries = (pS3Service, pLocalDir, pRemoteBucket, pBaseDir, pEntries) => {
    return pEntries.reduce((rPromise, rEntry) => {
        return rPromise.then(() => {
            const xFilePath = path.join(pLocalDir, rEntry);
            if (isDir(xFilePath)) {
                // Mantém a recursão serial para não alterar o comportamento operacional atual.
                return pS3Service.uploadDir(xFilePath, pRemoteBucket, path.join(pBaseDir, path.basename(xFilePath)));
            }
            if (rEntry.startsWith('.')) {
                // Continua ignorando arquivos ocultos como a implementação anterior já fazia.
                return Promise.resolve();
            }
            return pS3Service.uploadFile(xFilePath, pRemoteBucket, pBaseDir);
        });
    }, Promise.resolve());
};
