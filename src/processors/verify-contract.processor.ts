import { OnQueueActive, OnQueueCompleted, OnQueueError, OnQueueFailed, Process, Processor } from "@nestjs/bull";
import { Logger, Inject } from "@nestjs/common";
import { Job } from "bull";
import { CONTRACT_VERIFICATION, ErrorMap, SCHEMA_FILE, UPLOAD_STATUS } from "../common";
import { MODULE_REQUEST, REPOSITORY_INTERFACE } from "../module.config";
import {
    ISmartContractsRepository
} from "../repositories";
import { SmartContracts } from "../entities";
import { execSync } from 'child_process';
import { CommonService, RedisService } from "../shared/services";
import fs from 'fs';

@Processor('verify-source-code')
export class VerifyContractProcessor {
    private readonly _logger = new Logger(VerifyContractProcessor.name);
    private redisService = new RedisService();
    private commonService = new CommonService();
    private redisClient;
    private ioredis;

    constructor(
        @Inject(REPOSITORY_INTERFACE.ISMART_CONTRACTS_REPOSITORY)
        private smartContractsRepository: ISmartContractsRepository,
    ) {
        this._logger.log(
            '============== Constructor Verify Contract Processor Service ==============',
        );
        this.ioredis = this.redisService.getIoRedis(this.ioredis);
    }

    @Process({
        name: 'compile-wasm',
        concurrency: parseInt(process.env.CONCURRENCY_VERIFY_CONTRACT)
    })
    async handleVerifyContractJob(job: Job) {
        this._logger.log("Start verifying smart contract source code");
        this.redisClient = await this.redisService.getRedisClient(this.redisClient);
        let { request, contracts }: MODULE_REQUEST.VerifyContractJobRequest = job.data;
        let contractDir, contractFolder;
        if (request.compilerVersion.match(process.env.WORKSPACE_REGEX)) {
            // Folder name of the contract. Example: cw20-base
            contractFolder = request.wasmFile.split('.')[0].replace('_', '-');
            // Folder path of the contract in workspace contract case. 
            // Example: contracts/cw20-base
            contractDir = process.env.WORKSPACE_DIR + contractFolder;
        } else contractDir = '';

        let resultVerify = await this.compileSourceCode(request, contracts[0], contractDir);
        if (resultVerify.error) {
            this._logger.error('Verify contract failed');
            this._logger.error(resultVerify.error);
            this.ioredis.publish(process.env.REDIS_CHANNEL, JSON.stringify({
                Code: resultVerify.error.Code,
                Message: resultVerify.error.Message,
                CodeId: request.codeId,
                Verified: false
            }));
            await this.redisClient.del(process.env.ZIP_PREFIX + request.codeId);
            // this.commonService.removeTempDir(resultVerify.tempDir);
            return;
        }
        this._logger.log('Verify contract successfully');
        // Path to contract's zip file. Example: temp/tempdir1669369179601387/flower-store-contract/code_id_1.zip
        let s3Location = await this.commonService.uploadContractToS3(
            `${resultVerify.fullContractDir}${resultVerify.zipFile}`,
            resultVerify.zipFile
        );
        if (s3Location === '') {
            this.ioredis.publish(process.env.REDIS_CHANNEL, JSON.stringify({
                Code: ErrorMap.E500.Code,
                Message: ErrorMap.E500.Message,
                CodeId: request.codeId,
                Verified: false
            }));
            await this.redisClient.del(process.env.ZIP_PREFIX + request.codeId);
            this.commonService.removeTempDir(resultVerify.tempDir);
            return;
        }
        let schemaFiles, instantiateMsg, queryMsg, executeMsg;
        try {
            // Path to contract's schema files.
            // Example: temp/tempdir1669369179601387/flower-store-contract/schema/
            schemaFiles = fs.readdirSync(`${resultVerify.fullContractDir}${process.env.SCHEMA_DIR}`);
        } catch (error) {
            this._logger.error('Read schema dir failed');
            this._logger.error(error);
            this.ioredis.publish(process.env.REDIS_CHANNEL, JSON.stringify({
                Code: ErrorMap.E500.Code,
                Message: ErrorMap.E500.Message,
                CodeId: request.codeId,
                Verified: false
            }));
            await this.redisClient.del(process.env.ZIP_PREFIX + request.codeId);
            this.commonService.removeTempDir(resultVerify.tempDir);
            return;
        }
        for (let file of schemaFiles) {
            let data;
            try {
                // Path to specific contract's schema file.
                // Example: temp/tempdir1669369179601387/flower-store-contract/schema/query_msg.json
                data = fs.readFileSync(`${resultVerify.fullContractDir}${process.env.SCHEMA_DIR}${file}`);
            } catch (error) {
                this._logger.error('Read schema file failed');
                this._logger.error(error);
                this.ioredis.publish(process.env.REDIS_CHANNEL, JSON.stringify({
                    Code: ErrorMap.E500.Code,
                    Message: ErrorMap.E500.Message,
                    CodeId: request.codeId,
                    Verified: false
                }));
                await this.redisClient.del(process.env.ZIP_PREFIX + request.codeId);
                this.commonService.removeTempDir(resultVerify.tempDir);
                return;
            }
            switch (file) {
                case SCHEMA_FILE.INSTANTIATE:
                    instantiateMsg = data.toString();
                    break;
                case SCHEMA_FILE.QUERY:
                case SCHEMA_FILE.QUERY_CW2981:
                case SCHEMA_FILE.QUERY_FOR_EMPTY:
                    queryMsg = data.toString();
                    break;
                case SCHEMA_FILE.EXECUTE:
                case SCHEMA_FILE.CW20_EXECUTE:
                    executeMsg = data.toString();
                    break;
                case `${resultVerify.projectFolder}.json`:
                    let schema = JSON.parse(data.toString());
                    instantiateMsg = schema.instantiate.toString();
                    queryMsg = schema.query.toString();
                    executeMsg = schema.execute.toString();
                    break;
            }
        }
        let listQueries = [];
        // Git URL to specific commit. 
        // Example: https://github.com/aura-nw/flower-store-contract/commit/e3905a02e2c555226ddb92bbdc8739aeeaa87364
        let gitUrl = `${request.contractUrl}/commit/${request.commit}`;
        contracts.map(contract => {
            contract.contractVerification = CONTRACT_VERIFICATION.VERIFIED;
            contract.url = gitUrl;
            contract.compilerVersion = request.compilerVersion;
            contract.instantiateMsgSchema = instantiateMsg;
            contract.queryMsgSchema = queryMsg;
            contract.executeMsgSchema = executeMsg;
            contract.s3Location = s3Location;
            contract.verifiedAt = new Date();
            contract.mainnetUploadStatus = UPLOAD_STATUS.NOT_REGISTERED;
            listQueries.push(this.smartContractsRepository.update(contract));
        })
        try {
            await Promise.all(listQueries);
            this._logger.log('Update contracts successfully');
        } catch (error) {
            this._logger.error('Update contracts failed');
            this._logger.error(error);
            await this.redisClient.del(process.env.ZIP_PREFIX + request.codeId);
            this.commonService.removeTempDir(resultVerify.tempDir);
            return;
        }
        this.ioredis.publish(process.env.REDIS_CHANNEL, JSON.stringify({
            Code: ErrorMap.SUCCESSFUL.Code,
            Message: 'Verify contract successfully',
            CodeId: request.codeId,
            Verified: true
        }));
        await this.redisClient.del(process.env.ZIP_PREFIX + request.codeId);
        this.commonService.removeTempDir(resultVerify.tempDir);
    }

    @OnQueueActive()
    onActive(job: Job) {
        this._logger.log(`Processing job ${job.id} of type ${job.name}...`);
    }

    @OnQueueCompleted()
    onComplete(job: Job, result: any) {
        this._logger.log(`Completed job ${job.id} of type ${job.name}`);
        this._logger.log(`Result: ${result}`);
    }

    @OnQueueError()
    onError(job: Job, error: Error) {
        this._logger.error(`Job: ${job}`);
        this._logger.error(`Error job ${job.id} of type ${job.name}`);
        this._logger.error(`Error: ${error}`);
    }

    @OnQueueFailed()
    onFailed(job: Job, error: Error) {
        this._logger.error(`Failed job ${job.id} of type ${job.name}`);
        this._logger.error(`Error: ${error}`);
    }

    async compileSourceCode(
        request: MODULE_REQUEST.VerifySourceCodeRequest,
        contract: SmartContracts,
        contractDir: string
    ) {
        // Folder name of project. Example: cw-plus
        let projectFolder = request.contractUrl.substring(request.contractUrl.lastIndexOf('/') + 1);
        // Temp dir created to store source code. Example: temp/tempdir1669369179601387
        let tempDir = this.commonService.makeTempFile();
        // Path to compiled wasm file. 
        // Example: temp/tempdir1669369179601387/cw-plus/artifacts/cw20_base.wasm
        let wasmFileDir = `${tempDir}/${projectFolder}${process.env.ARTIFACTS}${request.wasmFile}`;

        let pwd = execSync('pwd').toString().replace('\n', '');

        // Path to clone project. Example: /home/andqk/verify-contract/temp/tempdir1669369179601387/cw-plus
        let resultGetSourceCode: number =
            this.commonService.cloneAndCheckOutContract(`${pwd}/${tempDir}/${projectFolder}`, request);
        switch (resultGetSourceCode) {
            case 1:
                return { error: ErrorMap.E006, tempDir };
            case 2:
                return { error: ErrorMap.E007, tempDir };
            case 3:
                return { error: ErrorMap.E008, tempDir };
        }

        // Full path from temp dir to contract folder. 
        // Example: temp/tempdir1669369179601387/cw-plus/contracts/cw20-base -- Workspace Project
        // Example: temp/tempdir1669369179601387/flower-store-contract -- Single Project
        let fullContractDir = contractDir !== ''
            ? `${tempDir}/${projectFolder}/${contractDir}/`
            : `${tempDir}/${projectFolder}/`;
        let compiled = await this.commonService.compileSourceCode(
            request.compilerVersion,
            `${pwd}/${tempDir}/${projectFolder}`,
            contractDir
        );
        if (!compiled) return { error: ErrorMap.E001, tempDir };

        let codeHash;
        try {
            codeHash = execSync(`sha256sum ${wasmFileDir}`).toString().split(' ')[0];
        } catch (error) {
            this._logger.error('Get data hash of compiled wasm file failed');
            this._logger.error(error);
            return { error: ErrorMap.E500, tempDir };
        }
        this._logger.log(`Result hash of compiled wasm file: ${codeHash}`);
        this._logger.log(`Result hash of network wasm file: ${contract.contractHash}`);

        if (codeHash !== contract.contractHash) return { error: ErrorMap.E001, tempDir };

        let zipFile = `${process.env.ZIP_PREFIX}${request.codeId}.zip`;
        try {
            execSync(`cd ${fullContractDir} && zip -r ${zipFile} ./schema/ ./src/ Cargo.toml Cargo.lock `);
        } catch (error) {
            this._logger.error('Create zip file of contract failed');
            this._logger.error(error);
            return { error: ErrorMap.E002 };
        }

        return { tempDir, fullContractDir, zipFile, contractDir, projectFolder };
    }
}