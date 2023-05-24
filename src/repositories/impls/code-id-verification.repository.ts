import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from './base.repository';
import { ObjectLiteral, Repository } from 'typeorm';
import { ENTITIES_CONFIG, MODULE_REQUEST } from '../../module.config';
import { ICodeIdVerificationRepository } from '../icode-id-verification.repository';
import { CodeIdVerification } from '../../entities';
import { VERIFY_CODE_RESULT } from 'src/common';
@Injectable()
export class CodeIdVerificationRepository
    extends BaseRepository
    implements ICodeIdVerificationRepository
{
    private readonly _logger = new Logger(CodeIdVerificationRepository.name);
    constructor(
        @InjectRepository(ENTITIES_CONFIG.CODE_ID_VERIFICATION)
        private readonly repos: Repository<ObjectLiteral>,
    ) {
        super(repos);
    }

    public async updateVerificationStatus(
        dataHash: string,
        codeId: number,
        verifiedInfo: MODULE_REQUEST.UpdateVerificationStatusRequest,
    ) {
        return await this.repos
            .createQueryBuilder()
            .update(CodeIdVerification)
            .set({
                verificationStatus: verifiedInfo.verificationStatus,
                githubUrl: verifiedInfo.githubUrl,
                compilerVersion: verifiedInfo.compilerVersion,
                instantiateMsgSchema: verifiedInfo.instantiateMsgSchema,
                queryMsgSchema: verifiedInfo.queryMsgSchema,
                executeMsgSchema: verifiedInfo.executeMsgSchema,
                s3Location: verifiedInfo.s3Location,
                verifiedAt: verifiedInfo.verifiedAt,
            })
            .where('dataHash = :dataHash', { dataHash })
            .orWhere('codeId = :codeId', { codeId })
            .execute();
    }

    public async updateVerifyStep(
        codeId: number,
        verifyStep: MODULE_REQUEST.UpdateVerifyStepRequest,
        verificationStatus?: string,
    ) {
        return await this.repos
            .createQueryBuilder()
            .update(CodeIdVerification)
            .set({
                verificationStatus,
                verifyStep,
            })
            .where({ codeId })
            .orderBy('created_at', 'DESC')
            .limit(1)
            .execute();
    }

    public async handleJobCrash(codeId: number) {
        const verify = await this.repos.findOne({
            where: {
                codeId,
            },
            order: {
                created_at: 'DESC',
            },
        });
        verify.verifyStep.result = VERIFY_CODE_RESULT.FAIL;
        return await this.repos
            .createQueryBuilder()
            .update(CodeIdVerification)
            .set({
                verifyStep: verify.verifyStep,
            })
            .where({ codeId })
            .orderBy('created_at', 'DESC')
            .limit(1)
            .execute();
    }
}
