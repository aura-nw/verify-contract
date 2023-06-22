import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from './base.repository';
import { ObjectLiteral, Repository } from 'typeorm';
import { ENTITIES_CONFIG, MODULE_REQUEST } from '../../module.config';
import { ICodeIdVerificationRepository } from '../icode-id-verification.repository';
import { CodeIdVerification } from '../../entities';
import { VERIFY_CODE_RESULT } from '../../common';
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
        verificationId: number,
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
            .where('id = :verificationId', { verificationId })
            .execute();
    }

    public async updateVerifyStep(
        id: number,
        codeId: number,
        verifyStep: MODULE_REQUEST.UpdateVerifyStepRequest,
        verificationStatus?: string,
    ) {
        const queryBuilder = this.repos.createQueryBuilder(
            'code_id_verification',
        );
        return await queryBuilder
            .update(CodeIdVerification)
            .set({
                verificationStatus,
                verifyStep,
            })
            .where({ codeId })
            .andWhere({ id })
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
