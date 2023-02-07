import * as axios from 'axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { IVerifyContractService } from '../iverify-contract.service';
import { MODULE_REQUEST, REPOSITORY_INTERFACE } from '../../module.config';
import { ISmartContractsRepository } from '../../repositories';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ResponseDto } from '../../dtos/responses';
import {
    CONTRACT_VERIFICATION,
    ErrorMap,
    LCD_QUERY,
    REDIS_VERIFY_STATUS,
} from '../../common';
import { SmartContracts } from 'src/entities';
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
        @Inject(REPOSITORY_INTERFACE.ISMART_CONTRACTS_REPOSITORY)
        private smartContractsRepository: ISmartContractsRepository,
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

        if (
            !request.compilerVersion.match(process.env.WORKSPACE_REGEX) &&
            !request.compilerVersion.match(process.env.RUST_REGEX)
        )
            return ResponseDto.response(ErrorMap.WRONG_COMPILER_IMAGE, {
                request,
            });
        // Notify stage `Compiler image format` passed
        this.ioredis.publish(
            process.env.REDIS_CHANNEL,
            JSON.stringify({
                Code: ErrorMap.CORRECT_COMPILER_IMAGE.Code,
                Message: ErrorMap.CORRECT_COMPILER_IMAGE.Message,
                CodeId: request.codeId,
            }),
        );

        this.redisClient = await this.redisService.getRedisClient(
            this.redisClient,
        );

        let query = request.codeId
            ? { codeId: request.codeId }
            : { contractAddress: request.contractAddress };
        let contracts: SmartContracts[] =
            await this.smartContractsRepository.findByCondition(query);
        if (contracts.length === 0) {
            this._logger.log(
                `Contract with code ID ${request.codeId} not found`,
            );
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
        if (
            contracts[0].contractVerification === CONTRACT_VERIFICATION.VERIFIED
        )
            return ResponseDto.response(ErrorMap.CODE_ID_ALREADY_VERIFIED, {
                request,
            });

        request.codeId = contracts[0].codeId;
        contracts = await this.smartContractsRepository.findByCondition({
            codeId: request.codeId,
        });
        const keyCodeId = await this.redisClient.get(
            process.env.ZIP_PREFIX + request.codeId,
        );
        if (keyCodeId) {
            this._logger.log(
                `Code ID ${request.codeId} is currently being verified`,
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

        // Set code id and contract address to redis to prevent duplicate requests
        await this.redisClient.set(
            process.env.ZIP_PREFIX + request.codeId,
            REDIS_VERIFY_STATUS.VERIFYING,
        );

        if (contracts[0].contractHash === '') {
            let dataHash = await this.getDataHash({ codeId: request.codeId });
            if (dataHash.Code === ErrorMap.E500.Code) {
                await this.redisClient.del(
                    process.env.ZIP_PREFIX + request.codeId,
                );
                return ResponseDto.response(ErrorMap.GET_DATA_HASH_FAIL, {
                    request,
                });
            }
            contracts.map(
                (contract) => (contract.contractHash = dataHash.Data.data_hash),
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

        this.syncQueue.add(
            'compile-wasm',
            {
                request,
                contracts,
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
