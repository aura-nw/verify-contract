import * as axios from 'axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { IVerifyContractService } from '../iverify-contract.service';
import { MODULE_REQUEST, REPOSITORY_INTERFACE } from '../../module.config';
import {
    ISmartContractCodeRepository,
    ISmartContractsRepository,
    IVerifyCodeStepRepository,
} from '../../repositories';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ResponseDto } from '../../dtos/responses';
import {
    CONTRACT_VERIFICATION,
    ErrorMap,
    LCD_QUERY,
    REDIS_VERIFY_STATUS,
    VERIFY_CODE_RESULT,
    VERIFY_STEP_CHECK_ID,
} from '../../common';
import { SmartContractCode, SmartContracts } from '../../../src/entities';
import { CommonService, RedisService } from '../../shared/services';
const _ = require('lodash');

@Injectable()
export class VerifyContractService implements IVerifyContractService {
    private readonly _logger = new Logger(VerifyContractService.name);
    private commonService = new CommonService();
    private redisClient;
    private lcd;
    private ioredis;

    constructor(
        private redisService: RedisService,
        @Inject(REPOSITORY_INTERFACE.ISMART_CONTRACTS_REPOSITORY)
        private smartContractsRepository: ISmartContractsRepository,
        @Inject(REPOSITORY_INTERFACE.ISMART_CONTRACT_CODE_REPOSITORY)
        private smartContractCodeRepository: ISmartContractCodeRepository,
        @Inject(REPOSITORY_INTERFACE.IVERIFY_CODE_STEP_REPOSITORY)
        private verifyCodeStepRepository: IVerifyCodeStepRepository,
        @InjectQueue('verify-source-code') private readonly syncQueue: Queue,
    ) {
        this._logger.log(
            '============== Constructor Verify Contract Service ==============',
        );
        this.lcd = process.env.LCD;
        this.ioredis = this.redisService.getIoRedis(this.ioredis);
    }

    async getDataHash(
        request: MODULE_REQUEST.GetDataHashRequest,
    ): Promise<ResponseDto> {
        this._logger.log(`Handle request get hash ${request}`);
        const { codeId } = request;
        try {
            this._logger.log(
                `Get data hash from LCD ${this.lcd}${LCD_QUERY.GET_DATA_CODE_ID}${codeId}`,
            );
            const result = (
                await axios.default.get(
                    `${this.lcd}${LCD_QUERY.GET_DATA_CODE_ID}${codeId}`,
                )
            ).data.code_info.data_hash.toLowerCase();
            return ResponseDto.response(ErrorMap.SUCCESSFUL, {
                data_hash: result,
            });
        } catch (error) {
            return ResponseDto.responseError(VerifyContractService.name, error);
        }
    }

    async verifySourceCode(
        request: MODULE_REQUEST.VerifySourceCodeRequest,
    ): Promise<ResponseDto> {
        this._logger.log(`Handle request verify ${JSON.stringify(request)}`);

        // Update stage `Code ID valid` status to 'In progress'
        await this.commonService.updateVerifyStatus(
            this.verifyCodeStepRepository,
            request.codeId,
            VERIFY_STEP_CHECK_ID.CODE_ID_VALID,
            VERIFY_CODE_RESULT.IN_PROGRESS,
            null,
        );
        let [contracts, smartContractCodes]: [
            SmartContracts[],
            SmartContractCode[],
        ] = await Promise.all([
            this.smartContractsRepository.findByCondition({
                codeId: request.codeId,
            }),
            this.smartContractCodeRepository.findByCondition({
                codeId: request.codeId,
            }),
        ]);
        if (smartContractCodes.length === 0) {
            this._logger.log(
                `Contract with code ID ${request.codeId} not found`,
            );
            // Update stage `Code ID valid` status to 'Fail'
            await Promise.all([
                this.commonService.updateVerifyStatus(
                    this.verifyCodeStepRepository,
                    request.codeId,
                    VERIFY_STEP_CHECK_ID.CODE_ID_VALID,
                    VERIFY_CODE_RESULT.FAIL,
                    ErrorMap.CODE_ID_NOT_FOUND.Code,
                ),
                this.commonService.updateContractAndCodeIDVerifyStatus(
                    this.smartContractsRepository,
                    this.smartContractCodeRepository,
                    request.codeId,
                    CONTRACT_VERIFICATION.VERIFYFAIL,
                ),
            ]);
            return ResponseDto.response(ErrorMap.CODE_ID_NOT_FOUND, {
                request,
            });
        }
        // Notify stage `Code ID valid` passed
        this.ioredis.publish(
            process.env.REDIS_CHANNEL,
            JSON.stringify({
                Code: ErrorMap.CODE_ID_VALID.Code,
                Message: ErrorMap.CODE_ID_VALID.Message,
                CodeId: request.codeId,
            }),
        );
        await Promise.all([
            // Update stage `Code ID valid` status to 'Success'
            this.commonService.updateVerifyStatus(
                this.verifyCodeStepRepository,
                request.codeId,
                VERIFY_STEP_CHECK_ID.CODE_ID_VALID,
                VERIFY_CODE_RESULT.SUCCESS,
                ErrorMap.CODE_ID_VALID.Code,
            ),
            // Update stage `Compiler image format` status to 'In progress'
            this.commonService.updateVerifyStatus(
                this.verifyCodeStepRepository,
                request.codeId,
                VERIFY_STEP_CHECK_ID.COMPILER_IMAGE_FORMAT,
                VERIFY_CODE_RESULT.IN_PROGRESS,
                null,
            ),
        ]);

        if (
            !request.compilerVersion.match(process.env.WORKSPACE_REGEX) &&
            !request.compilerVersion.match(process.env.RUST_REGEX)
        ) {
            // Update stage `Compiler image format` status to 'Fail'
            await Promise.all([
                this.commonService.updateVerifyStatus(
                    this.verifyCodeStepRepository,
                    request.codeId,
                    VERIFY_STEP_CHECK_ID.COMPILER_IMAGE_FORMAT,
                    VERIFY_CODE_RESULT.FAIL,
                    ErrorMap.WRONG_COMPILER_IMAGE.Code,
                ),
                this.commonService.updateContractAndCodeIDVerifyStatus(
                    this.smartContractsRepository,
                    this.smartContractCodeRepository,
                    request.codeId,
                    CONTRACT_VERIFICATION.VERIFYFAIL,
                ),
            ]);
            return ResponseDto.response(ErrorMap.WRONG_COMPILER_IMAGE, {
                request,
            });
        }
        // Notify stage `Compiler image format` passed
        this.ioredis.publish(
            process.env.REDIS_CHANNEL,
            JSON.stringify({
                Code: ErrorMap.CORRECT_COMPILER_IMAGE.Code,
                Message: ErrorMap.CORRECT_COMPILER_IMAGE.Message,
                CodeId: request.codeId,
            }),
        );
        await Promise.all([
            // Update stage `Compiler image format` status to 'Success'
            this.commonService.updateVerifyStatus(
                this.verifyCodeStepRepository,
                request.codeId,
                VERIFY_STEP_CHECK_ID.COMPILER_IMAGE_FORMAT,
                VERIFY_CODE_RESULT.SUCCESS,
                ErrorMap.CORRECT_COMPILER_IMAGE.Code,
            ),
            // Update stage `Code ID verification session valid` status to 'In progress'
            this.commonService.updateVerifyStatus(
                this.verifyCodeStepRepository,
                request.codeId,
                VERIFY_STEP_CHECK_ID.CODE_ID_SESSION_VALID,
                VERIFY_CODE_RESULT.IN_PROGRESS,
                null,
            ),
        ]);

        this.redisClient = await this.redisService.getRedisClient(
            this.redisClient,
        );

        if (
            smartContractCodes[0].contractVerification ===
            CONTRACT_VERIFICATION.VERIFIED
        )
            return ResponseDto.response(ErrorMap.CODE_ID_ALREADY_VERIFIED, {
                request,
            });

        const keyCodeId = await this.redisClient.get(
            process.env.ZIP_PREFIX + request.codeId,
        );
        if (keyCodeId) {
            this._logger.log(
                `Code ID ${request.codeId} is currently being verified`,
            );
            // Update stage `Code ID verification session valid` status to 'Fail'
            await Promise.all([
                this.commonService.updateVerifyStatus(
                    this.verifyCodeStepRepository,
                    request.codeId,
                    VERIFY_STEP_CHECK_ID.CODE_ID_SESSION_VALID,
                    VERIFY_CODE_RESULT.FAIL,
                    ErrorMap.CODE_ID_BEING_VERIFIED.Code,
                ),
                this.commonService.updateContractAndCodeIDVerifyStatus(
                    this.smartContractsRepository,
                    this.smartContractCodeRepository,
                    request.codeId,
                    CONTRACT_VERIFICATION.VERIFYFAIL,
                ),
            ]);
            return ResponseDto.response(ErrorMap.CODE_ID_BEING_VERIFIED, {
                request,
            });
        }
        // Notify stage `Code ID verification session valid` passed
        this.ioredis.publish(
            process.env.REDIS_CHANNEL,
            JSON.stringify({
                Code: ErrorMap.CODE_ID_SESSION_VALID.Code,
                Message: ErrorMap.CODE_ID_SESSION_VALID.Message,
                CodeId: request.codeId,
            }),
        );
        await Promise.all([
            // Update stage `Code ID verification session valid` status to 'Success'
            this.commonService.updateVerifyStatus(
                this.verifyCodeStepRepository,
                request.codeId,
                VERIFY_STEP_CHECK_ID.CODE_ID_SESSION_VALID,
                VERIFY_CODE_RESULT.SUCCESS,
                ErrorMap.CODE_ID_SESSION_VALID.Code,
            ),
            // Update stage `Get Code ID data hash` status to 'In progress'
            this.commonService.updateVerifyStatus(
                this.verifyCodeStepRepository,
                request.codeId,
                VERIFY_STEP_CHECK_ID.GET_DATA_HASH,
                VERIFY_CODE_RESULT.IN_PROGRESS,
                null,
            ),
        ]);

        // Set code id and contract address to redis to prevent duplicate requests
        await this.redisClient.set(
            process.env.ZIP_PREFIX + request.codeId,
            REDIS_VERIFY_STATUS.VERIFYING,
        );

        if (
            !smartContractCodes[0].contractHash ||
            smartContractCodes[0].contractHash === ''
        ) {
            let dataHash = await this.getDataHash({ codeId: request.codeId });
            if (dataHash.Code === ErrorMap.E500.Code) {
                await this.redisClient.del(
                    process.env.ZIP_PREFIX + request.codeId,
                );
                // Update stage `Get Code ID data hash` status to 'Fail'
                await Promise.all([
                    this.commonService.updateVerifyStatus(
                        this.verifyCodeStepRepository,
                        request.codeId,
                        VERIFY_STEP_CHECK_ID.GET_DATA_HASH,
                        VERIFY_CODE_RESULT.FAIL,
                        ErrorMap.GET_DATA_HASH_FAIL.Code,
                    ),
                    this.commonService.updateContractAndCodeIDVerifyStatus(
                        this.smartContractsRepository,
                        this.smartContractCodeRepository,
                        request.codeId,
                        CONTRACT_VERIFICATION.VERIFYFAIL,
                    ),
                ]);
                return ResponseDto.response(ErrorMap.GET_DATA_HASH_FAIL, {
                    request,
                });
            }
            smartContractCodes.map(
                (smartContractCode: SmartContractCode) =>
                    (smartContractCode.contractHash = dataHash.Data.data_hash),
            );
        }
        // Notify stage `Get Code ID data hash` passed
        this.ioredis.publish(
            process.env.REDIS_CHANNEL,
            JSON.stringify({
                Code: ErrorMap.GET_DATA_HASH_SUCCESSFUL.Code,
                Message: ErrorMap.GET_DATA_HASH_SUCCESSFUL.Message,
                CodeId: request.codeId,
            }),
        );
        await Promise.all([
            // Update stage `Get Code ID data hash` status to 'Success'
            this.commonService.updateVerifyStatus(
                this.verifyCodeStepRepository,
                request.codeId,
                VERIFY_STEP_CHECK_ID.GET_DATA_HASH,
                VERIFY_CODE_RESULT.SUCCESS,
                ErrorMap.GET_DATA_HASH_SUCCESSFUL.Code,
            ),
            // Update stage ``Get source code`` status to 'In progress'
            this.commonService.updateVerifyStatus(
                this.verifyCodeStepRepository,
                request.codeId,
                VERIFY_STEP_CHECK_ID.GET_SOURCE_CODE,
                VERIFY_CODE_RESULT.IN_PROGRESS,
                null,
            ),
        ]);

        this.syncQueue.add(
            'compile-wasm',
            {
                request,
                contracts,
                contractCode: smartContractCodes[0],
            } as MODULE_REQUEST.VerifyContractJobRequest,
            {
                removeOnComplete: true,
                removeOnFail: {
                    count: 3,
                },
            },
        );

        return ResponseDto.response(ErrorMap.SUCCESSFUL, { request });
    }
}
