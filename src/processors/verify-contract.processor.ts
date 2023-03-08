import {
    OnQueueActive,
    OnQueueCompleted,
    OnQueueError,
    OnQueueFailed,
    Process,
    Processor,
} from '@nestjs/bull';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bull';
import {
    CONTRACT_VERIFICATION,
    ErrorMap,
    SCHEMA_FILE,
    VERIFY_CODE_RESULT,
    VERIFY_STEP_CHECK_ID,
} from '../common';
import { MODULE_REQUEST, REPOSITORY_INTERFACE } from '../module.config';
import {
    ISmartContractCodeRepository,
    IVerifyCodeStepRepository,
} from '../repositories';
import { SmartContractCode, VerifyCodeStep } from '../entities';
import { execSync } from 'child_process';
import { CommonService, RedisService } from '../shared/services';
import fs from 'fs';

@Processor('verify-source-code')
export class VerifyContractProcessor {
    private readonly _logger = new Logger(VerifyContractProcessor.name);
    private redisService = new RedisService();
    private commonService = new CommonService();
    private redisClient;
    private ioredis;

    constructor(
        @Inject(REPOSITORY_INTERFACE.ISMART_CONTRACT_CODE_REPOSITORY)
        private smartContractCodeRepository: ISmartContractCodeRepository,
        @Inject(REPOSITORY_INTERFACE.IVERIFY_CODE_STEP_REPOSITORY)
        private verifyCodeStepRepository: IVerifyCodeStepRepository,
    ) {
        this._logger.log(
            '============== Constructor Verify Contract Processor Service ==============',
        );
        this.ioredis = this.redisService.getIoRedis(this.ioredis);
    }

    @Process({
        name: 'compile-wasm',
        concurrency: parseInt(process.env.CONCURRENCY_VERIFY_CONTRACT),
    })
    async handleVerifyContractJob(job: Job) {
        this._logger.log(
            `Start verify smart contract source code for job ${job.id}`,
        );

        this.redisClient = await this.redisService.getRedisClient(
            this.redisClient,
        );

        let { request, contractCode }: MODULE_REQUEST.VerifyContractJobRequest =
            job.data;

        let contractDir, contractFolder;
        if (request.compilerVersion.match(process.env.WORKSPACE_REGEX)) {
            // Folder name of the contract. Example: cw20-base
            contractFolder = new String(request.wasmFile.split('.')[0]);
            contractFolder = contractFolder.replaceAll('_', '-');
            // Folder path of the contract in workspace contract case.
            // Example: contracts/cw20-base
            contractDir = process.env.WORKSPACE_DIR + contractFolder;
        } else contractDir = '';

        let resultVerify = await this.compileSourceCode(
            request,
            contractCode,
            contractDir,
        );
        if (resultVerify.error) {
            this._logger.error('Verify contract failed');
            this._logger.error(resultVerify.error);
            // Notify stage `Compile source code` / `Get source code` / `Compare data hash` / `Internal process` failed
            this.ioredis.publish(
                process.env.REDIS_CHANNEL,
                JSON.stringify({
                    Code: resultVerify.error.Code,
                    Message: resultVerify.error.Message,
                    CodeId: request.codeId,
                    Verified: false,
                }),
            );
            await Promise.all([
                // Update stage `Compile source code` / `Get source code` / `Compare data hash` / `Internal process` status to 'Fail'
                this.commonService.updateVerifyStatus(
                    this.verifyCodeStepRepository,
                    request.codeId,
                    resultVerify.verifyItemCheckId,
                    VERIFY_CODE_RESULT.FAIL,
                    resultVerify.error.Code,
                ),
                this.commonService.updateCodeIDVerifyStatus(
                    this.smartContractCodeRepository,
                    request.codeId,
                    CONTRACT_VERIFICATION.VERIFYFAIL,
                ),
            ]);
            this.commonService.removeTempDir(resultVerify.tempDir);
            return;
        }
        this._logger.log('Verify contract successfully');

        // Path to contract's zip file. Example: temp/tempdir1669369179601387/flower-store-contract/code_id_1.zip
        let s3Location = await this.commonService.uploadContractToS3(
            `${resultVerify.fullContractDir}${resultVerify.zipFile}`,
            resultVerify.zipFile,
        );
        if (s3Location === '') {
            // Notify stage `Internal process` failed
            this.ioredis.publish(
                process.env.REDIS_CHANNEL,
                JSON.stringify({
                    Code: ErrorMap.INTERNAL_ERROR.Code,
                    Message: ErrorMap.INTERNAL_ERROR.Message,
                    CodeId: request.codeId,
                    Verified: false,
                }),
            );
            await Promise.all([
                // Update stage `Internal process` status to 'Fail'
                this.commonService.updateVerifyStatus(
                    this.verifyCodeStepRepository,
                    request.codeId,
                    VERIFY_STEP_CHECK_ID.INTERNAL_PROCESS,
                    VERIFY_CODE_RESULT.FAIL,
                    ErrorMap.INTERNAL_ERROR.Code,
                ),
                this.commonService.updateCodeIDVerifyStatus(
                    this.smartContractCodeRepository,
                    request.codeId,
                    CONTRACT_VERIFICATION.VERIFYFAIL,
                ),
            ]);
            this.commonService.removeTempDir(resultVerify.tempDir);
            return;
        }

        let schemaFiles, instantiateMsg, queryMsg, executeMsg;
        try {
            // Path to contract's schema files.
            // Example: temp/tempdir1669369179601387/flower-store-contract/schema/
            schemaFiles = fs.readdirSync(
                `${resultVerify.fullContractDir}${process.env.SCHEMA_DIR}`,
            );
        } catch (error) {
            this._logger.error('Read schema dir failed');
            this._logger.error(error);
            // Notify stage `Internal process` failed
            this.ioredis.publish(
                process.env.REDIS_CHANNEL,
                JSON.stringify({
                    Code: ErrorMap.INTERNAL_ERROR.Code,
                    Message: ErrorMap.INTERNAL_ERROR.Message,
                    CodeId: request.codeId,
                    Verified: false,
                }),
            );
            await Promise.all([
                // Update stage `Internal process` status to 'Fail'
                this.commonService.updateVerifyStatus(
                    this.verifyCodeStepRepository,
                    request.codeId,
                    VERIFY_STEP_CHECK_ID.INTERNAL_PROCESS,
                    VERIFY_CODE_RESULT.FAIL,
                    ErrorMap.INTERNAL_ERROR.Code,
                ),
                this.commonService.updateCodeIDVerifyStatus(
                    this.smartContractCodeRepository,
                    request.codeId,
                    CONTRACT_VERIFICATION.VERIFYFAIL,
                ),
            ]);
            this.commonService.removeTempDir(resultVerify.tempDir);
            return;
        }

        for (let file of schemaFiles) {
            let data;
            try {
                // Path to specific contract's schema file.
                // Example: temp/tempdir1669369179601387/flower-store-contract/schema/query_msg.json
                data = fs.readFileSync(
                    `${resultVerify.fullContractDir}${process.env.SCHEMA_DIR}${file}`,
                );
            } catch (error) {
                this._logger.error('Read schema file failed');
                this._logger.error(error);
                // Notify stage `Internal process` failed
                this.ioredis.publish(
                    process.env.REDIS_CHANNEL,
                    JSON.stringify({
                        Code: ErrorMap.INTERNAL_ERROR.Code,
                        Message: ErrorMap.INTERNAL_ERROR.Message,
                        CodeId: request.codeId,
                        Verified: false,
                    }),
                );
                await Promise.all([
                    // Update stage `Internal process` status to 'Fail'
                    this.commonService.updateVerifyStatus(
                        this.verifyCodeStepRepository,
                        request.codeId,
                        VERIFY_STEP_CHECK_ID.INTERNAL_PROCESS,
                        VERIFY_CODE_RESULT.FAIL,
                        ErrorMap.INTERNAL_ERROR.Code,
                    ),
                    this.commonService.updateCodeIDVerifyStatus(
                        this.smartContractCodeRepository,
                        request.codeId,
                        CONTRACT_VERIFICATION.VERIFYFAIL,
                    ),
                ]);
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
                case `${contractFolder}.json`:
                    let schema = JSON.parse(data.toString());
                    instantiateMsg = JSON.stringify(schema.instantiate);
                    queryMsg = JSON.stringify(schema.query);
                    executeMsg = JSON.stringify(schema.execute);
                    break;
            }
        }

        // Git URL to specific commit.
        // Example: https://github.com/aura-nw/flower-store-contract/commit/e3905a02e2c555226ddb92bbdc8739aeeaa87364
        let gitUrl = `${request.contractUrl}/commit/${request.commit}`;

        contractCode.contractVerification = CONTRACT_VERIFICATION.VERIFIED;
        contractCode.url = gitUrl;
        contractCode.compilerVersion = request.compilerVersion;
        contractCode.instantiateMsgSchema = instantiateMsg;
        contractCode.queryMsgSchema = queryMsg;
        contractCode.executeMsgSchema = executeMsg;
        contractCode.s3Location = s3Location;
        contractCode.verifiedAt = new Date();

        try {
            await this.smartContractCodeRepository.update(contractCode);
            this._logger.log('Update contracts successfully');
        } catch (error) {
            this._logger.error('Update contracts failed');
            this._logger.error(error);
            // Notify stage `Internal process` failed
            this.ioredis.publish(
                process.env.REDIS_CHANNEL,
                JSON.stringify({
                    Code: ErrorMap.INTERNAL_ERROR.Code,
                    Message: ErrorMap.INTERNAL_ERROR.Message,
                    CodeId: request.codeId,
                    Verified: false,
                }),
            );
            await Promise.all([
                // Update stage `Internal process` status to 'Fail'
                this.commonService.updateVerifyStatus(
                    this.verifyCodeStepRepository,
                    request.codeId,
                    VERIFY_STEP_CHECK_ID.INTERNAL_PROCESS,
                    VERIFY_CODE_RESULT.FAIL,
                    ErrorMap.INTERNAL_ERROR.Code,
                ),
                this.commonService.updateCodeIDVerifyStatus(
                    this.smartContractCodeRepository,
                    request.codeId,
                    CONTRACT_VERIFICATION.VERIFYFAIL,
                ),
            ]);
            this.commonService.removeTempDir(resultVerify.tempDir);
            return;
        }
        this.ioredis.publish(
            process.env.REDIS_CHANNEL,
            JSON.stringify({
                Code: ErrorMap.VERIFY_SUCCESSFUL.Code,
                Message: ErrorMap.VERIFY_SUCCESSFUL.Message,
                CodeId: request.codeId,
                Verified: true,
            }),
        );
        await Promise.all([
            // Update stage `Internal process` status to 'Success'
            this.commonService.updateVerifyStatus(
                this.verifyCodeStepRepository,
                request.codeId,
                VERIFY_STEP_CHECK_ID.INTERNAL_PROCESS,
                VERIFY_CODE_RESULT.SUCCESS,
                ErrorMap.VERIFY_SUCCESSFUL.Code,
            ),
        ]);
        this.commonService.removeTempDir(resultVerify.tempDir);

        return {};
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
    async onError(error: Error) {
        this._logger.error(`Error: ${error}`);

        const listUpdates: any[] = [];

        let codeId = error.message.substring(0, error.message.lastIndexOf(' '));
        codeId = codeId.substring(codeId.lastIndexOf(' ') + 1);
        listUpdates.push(
            this.redisClient.del(
                `verify-contract:verify-source-code:${codeId}`,
            ),
        );
        listUpdates.push(
            this.verifyCodeStepRepository.updateByCondition(
                { codeId, result: VERIFY_CODE_RESULT.IN_PROGRESS },
                { result: VERIFY_CODE_RESULT.FAIL },
            ),
        );

        await Promise.all(listUpdates);
    }

    @OnQueueFailed()
    async onFailed(job: Job, error: Error) {
        this._logger.error(`Failed job ${job.id} of type ${job.name}`);
        this._logger.error(`Error: ${error}`);

        const listUpdates: any[] = [];

        listUpdates.push(
            this.redisClient.del(
                `verify-contract:verify-source-code:${job.id}`,
            ),
        );

        listUpdates.push(
            this.verifyCodeStepRepository.updateByCondition(
                {
                    codeId: Number.parseInt(job.id.toString(), 10),
                    result: VERIFY_CODE_RESULT.IN_PROGRESS,
                },
                { result: VERIFY_CODE_RESULT.FAIL },
            ),
        );

        await Promise.all(listUpdates);
    }

    async compileSourceCode(
        request: MODULE_REQUEST.VerifySourceCodeRequest,
        contractCode: SmartContractCode,
        contractDir: string,
    ) {
        // Folder name of project. Example: cw-plus
        let projectFolder = request.contractUrl.substring(
            request.contractUrl.lastIndexOf('/') + 1,
        );
        // Temp dir created to store source code. Example: temp/tempdir1669369179601387
        let tempDir = this.commonService.makeTempFile();
        // Path to compiled wasm file.
        // Example: temp/tempdir1669369179601387/cw-plus/artifacts/cw20_base.wasm
        let wasmFileDir = `${tempDir}/${projectFolder}${process.env.ARTIFACTS}${request.wasmFile}`;

        let pwd = execSync('pwd').toString().replace('\n', '');

        // Path to clone project. Example: /home/andqk/verify-contract/temp/tempdir1669369179601387/cw-plus
        let resultGetSourceCode: number =
            this.commonService.cloneAndCheckOutContract(
                `${pwd}/${tempDir}/${projectFolder}`,
                request,
            );
        switch (resultGetSourceCode) {
            case 1:
                return {
                    error: ErrorMap.GET_SOURCE_CODE_FAIL,
                    tempDir,
                    verifyItemCheckId: VERIFY_STEP_CHECK_ID.GET_SOURCE_CODE,
                };
            case 2:
                return {
                    error: ErrorMap.COMMIT_NOT_FOUND,
                    tempDir,
                    verifyItemCheckId: VERIFY_STEP_CHECK_ID.GET_SOURCE_CODE,
                };
            case 3:
                return {
                    error: ErrorMap.MISSING_CARGO_LOCK,
                    tempDir,
                    verifyItemCheckId: VERIFY_STEP_CHECK_ID.GET_SOURCE_CODE,
                };
        }
        // Notify stage `Get source code` passed
        this.ioredis.publish(
            process.env.REDIS_CHANNEL,
            JSON.stringify({
                Code: ErrorMap.GET_SOURCE_CODE_SUCCESSFUL.Code,
                Message: ErrorMap.GET_SOURCE_CODE_SUCCESSFUL.Message,
                CodeId: request.codeId,
            }),
        );
        await Promise.all([
            // Update stage `Get source code` status to 'Success'
            this.commonService.updateVerifyStatus(
                this.verifyCodeStepRepository,
                request.codeId,
                VERIFY_STEP_CHECK_ID.GET_SOURCE_CODE,
                VERIFY_CODE_RESULT.SUCCESS,
                ErrorMap.GET_SOURCE_CODE_SUCCESSFUL.Code,
            ),
            // Update stage `Compile source code` status to 'In progress'
            this.commonService.updateVerifyStatus(
                this.verifyCodeStepRepository,
                request.codeId,
                VERIFY_STEP_CHECK_ID.COMPILE_SOURCE_CODE,
                VERIFY_CODE_RESULT.IN_PROGRESS,
                null,
            ),
        ]);

        // Full path from temp dir to contract folder.
        // Example: temp/tempdir1669369179601387/cw-plus/contracts/cw20-base -- Workspace Project
        // Example: temp/tempdir1669369179601387/flower-store-contract -- Single Project
        let fullContractDir =
            contractDir !== ''
                ? `${tempDir}/${projectFolder}/${contractDir}/`
                : `${tempDir}/${projectFolder}/`;
        let compiled = await this.commonService.compileSourceCode(
            request.compilerVersion,
            `${pwd}/${tempDir}/${projectFolder}`,
            contractDir,
            request.wasmFile,
        );
        if (!compiled)
            return {
                error: ErrorMap.COMPILE_SOURCE_CODE_FAIL,
                tempDir,
                verifyItemCheckId: VERIFY_STEP_CHECK_ID.COMPILE_SOURCE_CODE,
            };
        // Notify stage `Compile source code` passed
        this.ioredis.publish(
            process.env.REDIS_CHANNEL,
            JSON.stringify({
                Code: ErrorMap.COMPILE_SOURCE_CODE_SUCCESSFUL.Code,
                Message: ErrorMap.COMPILE_SOURCE_CODE_SUCCESSFUL.Message,
                CodeId: request.codeId,
            }),
        );
        await Promise.all([
            // Update stage `Compile source code` status to 'Success'
            this.commonService.updateVerifyStatus(
                this.verifyCodeStepRepository,
                request.codeId,
                VERIFY_STEP_CHECK_ID.COMPILE_SOURCE_CODE,
                VERIFY_CODE_RESULT.SUCCESS,
                ErrorMap.COMPILE_SOURCE_CODE_SUCCESSFUL.Code,
            ),
            // Update stage `Compare data hash` status to 'In progress'
            this.commonService.updateVerifyStatus(
                this.verifyCodeStepRepository,
                request.codeId,
                VERIFY_STEP_CHECK_ID.COMPARE_DATA_HASH,
                VERIFY_CODE_RESULT.IN_PROGRESS,
                null,
            ),
        ]);

        let codeHash;
        try {
            codeHash = execSync(`sha256sum ${wasmFileDir}`)
                .toString()
                .split(' ')[0];
        } catch (error) {
            this._logger.error('Get data hash of compiled wasm file failed');
            this._logger.error(error);
            return {
                error: ErrorMap.WRONG_WASM_FILE,
                tempDir,
                verifyItemCheckId: VERIFY_STEP_CHECK_ID.COMPARE_DATA_HASH,
            };
        }
        this._logger.log(
            `Result hash of compiled wasm file for Code ID ${contractCode.codeId}: ${codeHash}`,
        );
        this._logger.log(
            `Result hash of network wasm file for Code ID ${contractCode.codeId}: ${contractCode.contractHash}`,
        );

        if (codeHash !== contractCode.contractHash)
            return {
                error: ErrorMap.DATA_HASH_MISMATCH,
                tempDir,
                verifyItemCheckId: VERIFY_STEP_CHECK_ID.COMPARE_DATA_HASH,
            };
        // Notify stage `Compare data hash` passed
        this.ioredis.publish(
            process.env.REDIS_CHANNEL,
            JSON.stringify({
                Code: ErrorMap.DATA_HASH_MATCH.Code,
                Message: ErrorMap.DATA_HASH_MATCH.Message,
                CodeId: request.codeId,
            }),
        );
        await Promise.all([
            // Update stage `Compare data hash` status to 'Success'
            this.commonService.updateVerifyStatus(
                this.verifyCodeStepRepository,
                request.codeId,
                VERIFY_STEP_CHECK_ID.COMPARE_DATA_HASH,
                VERIFY_CODE_RESULT.SUCCESS,
                ErrorMap.DATA_HASH_MATCH.Code,
            ),
            // Update stage `Internal process` status to 'In progress'
            this.commonService.updateVerifyStatus(
                this.verifyCodeStepRepository,
                request.codeId,
                VERIFY_STEP_CHECK_ID.INTERNAL_PROCESS,
                VERIFY_CODE_RESULT.IN_PROGRESS,
                null,
            ),
        ]);

        let zipFile = `${process.env.ZIP_PREFIX}${request.codeId}.zip`;
        try {
            execSync(
                `cd ${fullContractDir} && zip -r ${zipFile} ./schema/ ./src/ Cargo.toml Cargo.lock `,
            );
        } catch (error) {
            this._logger.error('Create zip file of contract failed');
            this._logger.error(error);
            return {
                error: ErrorMap.INTERNAL_ERROR,
                tempDir,
                verifyItemCheckId: VERIFY_STEP_CHECK_ID.INTERNAL_PROCESS,
            };
        }

        return {
            tempDir,
            fullContractDir,
            zipFile,
            contractDir,
            projectFolder,
        };
    }
}
