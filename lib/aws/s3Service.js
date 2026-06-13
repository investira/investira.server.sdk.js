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

/**
 * Chamadas aos serviços do S3 da AWS
 *
 * @param {object} [pOptions={accessKeyId: null, secretAccessKey: null, region: 'sa-east-1'}]
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
     * Faz upload de arquivo
     *
     * @param {object} pLocalFile Arquivo local
     * @return {Promise} Com a resposta do S3
     */
    this.uploadFile = (pLocalFile, pRemoteBucket, pRemoteFolder = '') => {
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
     * Recupera o arquivo no S3
     *
     * @param {string} pFileKey Arquivo local
     * @return {Promise} Com a resposta do S3
     */
    this.readFile = (pFileKey, pRemoteBucket, pRemoteFolder = '') => {
        const xParams = pvBuildObjectParams(pFileKey, pRemoteBucket, pRemoteFolder);
        return this.s3.send(new GetObjectCommand(xParams));
    };
    /**
     * Stream do arquivo no S3
     *
     * @param {string} pFileKey Arquivo local
     * @return {Promise} Com a resposta do S3
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
     * Upload de uma pasta
     *
     * @param {String} pLocalDir Pasta local
     * @param {String} pRemoteBucket Nome do bucket
     * @param {*} [pBaseDir=null]
     * @return {*}
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
     * Exclui o diretório
     *
     * @param {String} pRemoteBucket Nome do bucket
     * @param {String} pRemoteDir Nome da pasta remota
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
     * Copia arquivo de um bucker para outro
     *
     * @param {*} pOrigin Deve conter o caminho completo do bucket incluindo o nome do arquivo
     * @param {*} pDestinationBucket Deve conter somente o caminho completo do bucket sem o nome do arquivo
     * @return {*}
     */
    this.copyFileToAnotherBucket = (pOrigin, pDestinationBucket) => {
        const xParams = {
            Bucket: pDestinationBucket,
            CopySource: pOrigin
        };
        xParams.Key = path.basename(pOrigin);
        return this.s3.send(new CopyObjectCommand(xParams));
    };

    /**
     * Retorna se arquivo existe no s3
     *
     * @param {*} pFile
     * @return {*}
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
 * Retorna configuração do cliente S3.
 *
 * @param {object} pOptions
 * @return {object}
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
 * Monta parâmetros padrão de bucket e chave.
 *
 * @param {string} pFileKey
 * @param {string} pRemoteBucket
 * @param {string} [pRemoteFolder='']
 * @return {object}
 */
const pvBuildObjectParams = (pFileKey, pRemoteBucket, pRemoteFolder = '') => {
    return {
        Bucket: pRemoteBucket,
        Key: path.join(pRemoteFolder, path.basename(pFileKey))
    };
};

/**
 * Normaliza retorno de upload para manter compatibilidade.
 *
 * @param {object} pUploadResult
 * @param {string} pRegion
 * @param {object} pParams
 * @return {object}
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
 * Constrói URL pública compatível com retorno legado do upload.
 *
 * @param {string} pRegion
 * @param {string} pBucket
 * @param {string} pKey
 * @return {string}
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
 * Converte o retorno do S3 em stream compatível com Node.js.
 *
 * @param {*} pBody
 * @return {Promise<Readable>}
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
 * Faz upload recursivo dos arquivos de um diretório.
 *
 * @param {object} pS3Service
 * @param {string} pLocalDir
 * @param {string} pRemoteBucket
 * @param {string} pBaseDir
 * @param {string[]} pEntries
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
