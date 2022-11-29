import * as axios from 'axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { IVerifyContractService } from '../iverify-contract.service';
import { MODULE_REQUEST, REPOSITORY_INTERFACE } from '../../module.config';
import { ISmartContractsRepository } from '../../repositories';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ResponseDto } from '../../dtos/responses';
import { CONTRACT_VERIFICATION, ErrorMap, LCD_QUERY, REDIS_VERIFY_STATUS } from '../../common';
import { SmartContracts } from 'src/entities';
import { RedisService } from '../../shared/services';
const _ = require('lodash');

@Injectable()
export class VerifyContractService implements IVerifyContractService {
    private readonly _logger = new Logger(VerifyContractService.name);
    private redisClient;
    private lcd;

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
    }

    async getDataHash(request: MODULE_REQUEST.GetDataHashRequest): Promise<ResponseDto> {
        this._logger.log(`Handle request get hash ${request}`);
        const { codeId } = request;
        try {
            this._logger.log(`Get data hash from LCD ${this.lcd}${LCD_QUERY.GET_DATA_CODE_ID}${codeId}`);
            const result = (await axios.default.get(`${this.lcd}${LCD_QUERY.GET_DATA_CODE_ID}${codeId}`))
                .data.code_info.data_hash.toLowerCase();
            return ResponseDto.response(ErrorMap.SUCCESSFUL, { data_hash: result });
        } catch (error) {
            return ResponseDto.responseError(VerifyContractService.name, error);
        }
    }

    async verifySourceCode(request: MODULE_REQUEST.VerifySourceCodeRequest): Promise<ResponseDto> {
        this._logger.log(`Handle request verify ${JSON.stringify(request)}`);
        this.redisClient = await this.redisService.getRedisClient(this.redisClient);
        let query = request.codeId ? { codeId: request.codeId } : { contractAddress: request.contractAddress };
        query['contractVerification'] = CONTRACT_VERIFICATION.UNVERIFIED; 
        let contracts: SmartContracts[] = await this.smartContractsRepository.findByCondition(query);
        if (contracts.length === 0) {
            this._logger.log(`Contract with code ID ${request.codeId} not found`);
            return ResponseDto.response(ErrorMap.E003, { request });
        }
        request.codeId = contracts[0].codeId;
        const keyCodeId = await this.redisClient.get(process.env.ZIP_PREFIX + request.codeId);
        if (keyCodeId) {
            this._logger.log(`Code ID ${request.codeId} is already being verified`);
            return ResponseDto.response(ErrorMap.E004, { request });
        }

        // Set code id and contract address to redis to prevent duplicate requests
        await this.redisClient.set(process.env.ZIP_PREFIX + request.codeId, REDIS_VERIFY_STATUS.VERIFYING);

        if (contracts[0].contractHash === '') {
            let dataHash = await this.getDataHash({ codeId: request.codeId });
            if (dataHash.ErrorCode === ErrorMap.E500.Code) {
                await this.redisClient.del(process.env.ZIP_PREFIX + request.codeId);
                return ResponseDto.response(ErrorMap.E005, { request });
            }
            contracts.map(contract => contract.contractHash = dataHash.Data.data_hash);
        }
        this.syncQueue.add('compile-wasm', {
            request,
            contracts
        } as MODULE_REQUEST.VerifyContractJobRequest);

        return ResponseDto.response(ErrorMap.SUCCESSFUL, { request });
    }
}
