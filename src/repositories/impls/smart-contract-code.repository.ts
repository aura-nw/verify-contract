import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from './base.repository';
import { ObjectLiteral, Repository } from 'typeorm';
import { ENTITIES_CONFIG, MODULE_REQUEST } from '../../module.config';
import { ISmartContractCodeRepository } from '../ismart-contract-code.repository';
import { SmartContractCode } from '../../entities';
@Injectable()
export class SmartContractCodeRepository
    extends BaseRepository
    implements ISmartContractCodeRepository
{
    private readonly _logger = new Logger(SmartContractCodeRepository.name);
    constructor(
        @InjectRepository(ENTITIES_CONFIG.SMART_CONTRACT_CODE)
        private readonly repos: Repository<ObjectLiteral>,
    ) {
        super(repos);
    }

    public async updateVerificationStatus(
        contractHash: string,
        codeId: number,
        verifiedInfo: MODULE_REQUEST.UpdateVerificationStatusRequest,
    ) {
        return await this.repos
            .createQueryBuilder()
            .update(SmartContractCode)
            .set({
                contractVerification: verifiedInfo.contractVerification,
                url: verifiedInfo.url,
                compilerVersion: verifiedInfo.compilerVersion,
                instantiateMsgSchema: verifiedInfo.instantiateMsgSchema,
                queryMsgSchema: verifiedInfo.queryMsgSchema,
                executeMsgSchema: verifiedInfo.executeMsgSchema,
                s3Location: verifiedInfo.s3Location,
                verifiedAt: verifiedInfo.verifiedAt,
            })
            .where('contractHash = :contractHash', { contractHash })
            .orWhere('codeId = :codeId', { codeId })
            .execute();
    }
}
