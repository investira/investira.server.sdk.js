const path = require('path');
const util = require('util');
const AWS = require('aws-sdk');
const { isEmpty } = require('investira.sdk').validators;

const fs = require('fs');
const { readDir, isDir } = require('../utils/files');
// @ts-ignore
const { BadRequestError } = require('investira.sdk').messages.ClientErrors;

/**
 * Chamadas aos serviços do S3 da AWS
 *
 * @param {object} [pOptions={accessKeyId: null, secretAccessKey: null, region: 'sa-east-1'}]
 */
const s3Service = function (pOptions = {}) {
    const xOptions = {
        accessKeyId: null,
        secretAccessKey: null,
        region: 'sa-east-1', //Região padrão
        apiVersion: '2010-03-31', //Versão padrão
        ...pOptions //Sobrescreve os valores padrão
    };
    this.s3 = new AWS.S3({
        accessKeyId: xOptions.accessKeyId,
        secretAccessKey: xOptions.secretAccessKey
    });

    /**
     * Faz upload de arquivo
     *
     * @param {object} pLocalFile Arquivo local
     * @return {Promise} Com a resposta do S3
     */
    this.uploadFile = (pLocalFile, pRemoteBucket, pRemoteFolder = '') => {
        // read file contents
        return new Promise((pResolve, pReject) => {
            if (!pLocalFile) {
                return pReject(new BadRequestError('Source file não informada.'));
            }
            if (!pRemoteBucket) {
                return pReject(new BadRequestError('Remote Bucket não informada.'));
            }
            //Lê arquivo
            fs.readFile(pLocalFile, (pErr, pData) => {
                if (pErr) {
                    return pReject(pErr);
                }
                //Configura data para fazer o upload
                const xParams = {
                    Bucket: pRemoteBucket, // pass your bucket name
                    // Prefix: pRemoteFolder, // `${pRemoteFolder}`,
                    Key: path.join(pRemoteFolder, path.basename(pLocalFile)), // file will be saved as testBucket/contacts.csv
                    Body: pData
                };
                //efetua o upload
                this.s3.upload(xParams, (pS3Err, pData) => {
                    if (pS3Err) {
                        console.log(util.inspect(xParams));
                        return pReject(pS3Err);
                    }
                    pResolve(pData);
                });
            });
        });
    };
    /**
     * Recupera o arquivo no S3
     *
     * @param {string} pFileKey Arquivo local
     * @return {Promise} Com a resposta do S3
     */
    this.readFile = (pFileKey, pRemoteBucket, pRemoteFolder = '') => {
        // read file contents
        const xParams = {
            Bucket: pRemoteBucket,
            Key: path.join(pRemoteFolder, path.basename(pFileKey))
        };
        return this.s3.getObject(xParams).promise();
    };
    /**
     * Stream do arquivo no S3
     *
     * @param {string} pFileKey Arquivo local
     * @return {Promise} Com a resposta do S3
     */
    this.streamFile = (pFileKey, pRemoteBucket, pRemoteFolder = '') => {
        // read file contents
        const xParams = {
            Bucket: pRemoteBucket,
            Key: path.join(pRemoteFolder, path.basename(pFileKey))
        };
        return this.s3
            .headObject(xParams)
            .promise()
            .then(() => {
                return this.s3.getObject(xParams).createReadStream();
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
        return readDir(pLocalDir).then(async rEntries => {
            if (!rEntries || rEntries.length === 0) {
                return Promise.reject(`Invalid or empty folder ${pLocalDir}`);
            }
            // for each file in the directory
            for (const xEntry of rEntries) {
                // get the full path of the file
                const xFilePath = path.join(pLocalDir, xEntry);
                // ignore if directory
                if (isDir(xFilePath)) {
                    //Create dir
                    await this.uploadDir(xFilePath, pRemoteBucket, path.join(pBaseDir, path.basename(xFilePath)));
                } else {
                    if (!xEntry.startsWith('.')) {
                        await this.uploadFile(xFilePath, pRemoteBucket, pBaseDir);
                    }
                }
            }
            return Promise.resolve();
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
            .listObjectsV2({
                Bucket: pRemoteBucket,
                Prefix: pRemoteDir
            })
            .promise()
            .then(rObjetosPastaPessoa => {
                if (isEmpty(rObjetosPastaPessoa.Contents)) {
                    return Promise.resolve();
                }
                const xDeleteParams = {
                    Bucket: pRemoteBucket,
                    Delete: { Objects: [] }
                };
                rObjetosPastaPessoa.Contents.forEach(({ Key }) => {
                    xDeleteParams.Delete.Objects.push({ Key });
                });
                return this.s3.deleteObjects(xDeleteParams).promise();
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
        return this.s3.copyObject(xParams).promise();
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
        return this.s3
            .headObject(xParams)
            .promise()
            .catch(_rErr => {
                return false;
            });
    };

    return this;
};

module.exports = s3Service;
