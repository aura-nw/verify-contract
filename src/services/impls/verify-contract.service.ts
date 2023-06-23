import * as axios from 'axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { IVerifyContractService } from '../iverify-contract.service';
import { MODULE_REQUEST, REPOSITORY_INTERFACE } from '../../module.config';
import {
    ICodeIdVerificationRepository,
    ICodeRepository,
} from '../../repositories';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ResponseDto } from '../../dtos/responses';
import {
    VERIFICATION_STATUS,
    ErrorMap,
    LCD_QUERY,
    VERIFY_CODE_RESULT,
    VERIFY_STEP_CHECK_ID,
} from '../../common';
import { Code } from '../../../src/entities';
import { RedisService } from '../../shared/services';
const _ = require('lodash');

@Injectable()
export class VerifyContractService implements IVerifyContractService {
    private readonly _logger = new Logger(VerifyContractService.name);
    private redisClient;
    private lcd;
    private ioredis;

    constructor(
        private redisService: RedisService,
        @Inject(REPOSITORY_INTERFACE.ICODE_ID_VERIFICATION_REPOSITORY)
        private codeIdVerificationRepository: ICodeIdVerificationRepository,
        @Inject(REPOSITORY_INTERFACE.ICODE_REPOSITORY)
        private codeRepository: ICodeRepository,
        @InjectQueue('verify-source-code') private readonly syncQueue: Queue,
        @InjectQueue('detect-stuck-jobs') private readonly detectQueue: Queue,
    ) {
        this._logger.log(
            '============== Constructor Verify Contract Service ==============',
        );
        this.lcd = process.env.LCD;
        this.ioredis = this.redisService.getIoRedis(this.ioredis);
        this.detectQueue.add(
            'get-stuck-jobs',
            {
            },
            {
                removeOnComplete: true,
                removeOnFail: true,
                // repeat: {
                //     every: parseInt(process.env.MILLISECOND_DETECT_JOBS),
                // },
            },
        );
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

        if (
            (
                await this.codeIdVerificationRepository.findByCondition({
                    codeId: request.codeId,
                    verificationStatus: VERIFICATION_STATUS.SUCCESS,
                })
            ).length > 0
        )
            return ResponseDto.response(ErrorMap.CODE_ID_ALREADY_VERIFIED, {
                request,
            });

        let codes: Code[] = await this.codeRepository.findByCondition({
            codeId: request.codeId,
        });
        let verification = null;
        if (codes.length === 0) {
            this._logger.log(
                `Contract with code ID ${request.codeId} not found`,
            );
            // Update stage `Code ID valid` status to 'Fail'
            verification = await this.codeIdVerificationRepository.create({
                codeId: request.codeId,
                dataHash: '',
                instantiateMsgSchema: null,
                queryMsgSchema: null,
                executeMsgSchema: null,
                s3Location: null,
                verificationStatus: VERIFICATION_STATUS.FAIL,
                compilerVersion: null,
                githubUrl: null,
                verifyStep: {
                    step: VERIFY_STEP_CHECK_ID.CODE_ID_VALID,
                    result: VERIFY_CODE_RESULT.FAIL,
                    msg_code: ErrorMap.CODE_ID_NOT_FOUND.Code,
                },
                verifiedAt: null,
            });
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
        // Update stage `Compiler image format` status to 'In progress'
        verification = await this.codeIdVerificationRepository.create({
            codeId: request.codeId,
            dataHash: codes[0].dataHash,
            instantiateMsgSchema: null,
            queryMsgSchema: null,
            executeMsgSchema: null,
            s3Location: null,
            verificationStatus: VERIFICATION_STATUS.VERIFYING,
            compilerVersion: null,
            githubUrl: null,
            verifyStep: {
                step: VERIFY_STEP_CHECK_ID.COMPILER_IMAGE_FORMAT,
                result: VERIFY_CODE_RESULT.IN_PROGRESS,
                msg_code: null,
            },
            verifiedAt: null,
        });

        if (
            !request.compilerVersion.match(process.env.WORKSPACE_REGEX) &&
            !request.compilerVersion.match(process.env.RUST_REGEX)
        ) {
            // Update stage `Compiler image format` status to 'Fail'
            await this.codeIdVerificationRepository.updateVerifyStep(
                verification.id,
                request.codeId,
                {
                    step: VERIFY_STEP_CHECK_ID.COMPILER_IMAGE_FORMAT,
                    result: VERIFY_CODE_RESULT.FAIL,
                    msg_code: ErrorMap.WRONG_COMPILER_IMAGE.Code,
                },
                VERIFICATION_STATUS.FAIL,
            );
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
        // Update stage `Code ID verification session valid` status to 'In progress'
        await this.codeIdVerificationRepository.updateVerifyStep(
            verification.id,
            request.codeId,
            {
                step: VERIFY_STEP_CHECK_ID.CODE_ID_SESSION_VALID,
                result: VERIFY_CODE_RESULT.IN_PROGRESS,
                msg_code: null,
            },
        );

        this.redisClient = await this.redisService.getRedisClient(
            this.redisClient,
        );

        const keyCodeId = await this.redisClient.exists(
            `verify-contract:verify-source-code:${request.codeId}`,
        );
        if (keyCodeId === 1) {
            this._logger.log(
                `Code ID ${request.codeId} is currently being verified`,
            );
            // Update stage `Code ID verification session valid` status to 'Fail'
            await this.codeIdVerificationRepository.updateVerifyStep(
                verification.id,
                request.codeId,
                {
                    step: VERIFY_STEP_CHECK_ID.CODE_ID_SESSION_VALID,
                    result: VERIFY_CODE_RESULT.FAIL,
                    msg_code: ErrorMap.CODE_ID_BEING_VERIFIED.Code,
                },
                VERIFICATION_STATUS.FAIL,
            );
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
        // Update stage `Get Code ID data hash` status to 'In progress'
        await this.codeIdVerificationRepository.updateVerifyStep(
            verification.id,
            request.codeId,
            {
                step: VERIFY_STEP_CHECK_ID.GET_DATA_HASH,
                result: VERIFY_CODE_RESULT.IN_PROGRESS,
                msg_code: null,
            },
        );

        if (!codes[0].dataHash || codes[0].dataHash === '') {
            const dataHash = await this.getDataHash({ codeId: request.codeId });
            if (dataHash.Code === ErrorMap.E500.Code) {
                // Update stage `Get Code ID data hash` status to 'Fail'
                await this.codeIdVerificationRepository.updateVerifyStep(
                    verification.id,
                    request.codeId,
                    {
                        step: VERIFY_STEP_CHECK_ID.GET_DATA_HASH,
                        result: VERIFY_CODE_RESULT.FAIL,
                        msg_code: ErrorMap.GET_DATA_HASH_FAIL.Code,
                    },
                    VERIFICATION_STATUS.FAIL,
                );
                return ResponseDto.response(ErrorMap.GET_DATA_HASH_FAIL, {
                    request,
                });
            }
            codes[0].dataHash = dataHash.Data.data_hash;
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
        // Update stage `Get Code ID data hash` status to 'Success'
        await this.codeIdVerificationRepository.updateVerifyStep(
            verification.id,
            request.codeId,
            {
                step: VERIFY_STEP_CHECK_ID.GET_DATA_HASH,
                result: VERIFY_CODE_RESULT.SUCCESS,
                msg_code: ErrorMap.GET_DATA_HASH_SUCCESSFUL.Code,
            },
        );

        this.syncQueue.add(
            'compile-wasm',
            {
                request,
                dataHash: codes[0].dataHash,
                verificationId: verification.id,
            } as MODULE_REQUEST.VerifyContractJobRequest,
            {
                jobId: request.codeId,
                removeOnComplete: true,
                removeOnFail: true,
            },
        );

        return ResponseDto.response(ErrorMap.SUCCESSFUL, { request });
    }
}
