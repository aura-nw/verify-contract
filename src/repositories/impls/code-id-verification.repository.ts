import { Injectable } from '@nestjs/common';
import { InjectRepository, getEntityManagerToken } from '@nestjs/typeorm';
import { BaseRepository } from './base.repository';
import { EntityManager, ObjectLiteral, Repository } from 'typeorm';
import { ENTITIES_CONFIG, MODULE_REQUEST } from '../../module.config';
import { ICodeIdVerificationRepository } from '../icode-id-verification.repository';
import { CodeIdVerification } from '../../entities';
import { VERIFICATION_STATUS, VERIFY_CODE_RESULT } from '../../common';
import { ModuleRef } from '@nestjs/core';
@Injectable()
// extends BaseRepository
// implements ICodeIdVerificationRepository
export class CodeIdVerificationRepository {
    constructor(
        // @InjectRepository(ENTITIES_CONFIG.CODE_ID_VERIFICATION)
        // private readonly repos: Repository<ObjectLiteral>,
        private moduleRef: ModuleRef,
    ) {
        // super(repos);
    }

    public async updateVerificationStatus(
        verificationId: number,
        verifiedInfo: MODULE_REQUEST.UpdateVerificationStatusRequest,
        dbName: string,
    ) {
        return (await this.loadEntityManager(dbName))
            .createQueryBuilder(CodeIdVerification, '_')
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

        // return await this.repos
        //     .createQueryBuilder()
        //     .update(CodeIdVerification)
        //     .set({
        //         verificationStatus: verifiedInfo.verificationStatus,
        //         githubUrl: verifiedInfo.githubUrl,
        //         compilerVersion: verifiedInfo.compilerVersion,
        //         instantiateMsgSchema: verifiedInfo.instantiateMsgSchema,
        //         queryMsgSchema: verifiedInfo.queryMsgSchema,
        //         executeMsgSchema: verifiedInfo.executeMsgSchema,
        //         s3Location: verifiedInfo.s3Location,
        //         verifiedAt: verifiedInfo.verifiedAt,
        //     })
        //     .where('id = :verificationId', { verificationId })
        //     .execute();
    }

    public async updateVerifyStep(
        id: number,
        codeId: number,
        verifyStep: MODULE_REQUEST.UpdateVerifyStepRequest,
        dbName: string,
        verificationStatus?: string,
    ) {
        return (await this.loadEntityManager(dbName))
            .createQueryBuilder(CodeIdVerification, '_')
            .update(CodeIdVerification)
            .set({
                verificationStatus,
                verifyStep,
            } as any)
            .where({ codeId })
            .andWhere({ id })
            .execute();

        // const queryBuilder = this.repos.createQueryBuilder(
        //     'code_id_verification',
        // );
        // return await queryBuilder
        //     .update(CodeIdVerification)
        //     .set({
        //         verificationStatus,
        //         verifyStep,
        //     })
        //     .where({ codeId })
        //     .andWhere({ id })
        //     .execute();
    }

    public async handleJobCrash(codeId: number, dbName: string) {
        const entityManager = await this.loadEntityManager(dbName);

        const verify = await entityManager.findOne(CodeIdVerification, {
            where: {
                codeId,
            },
            order: {
                id: 'DESC',
            },
        });
        verify.verifyStep.result = VERIFY_CODE_RESULT.FAIL;
        return await entityManager
            .createQueryBuilder(CodeIdVerification, '_')
            .update(CodeIdVerification)
            .set({
                verifyStep: verify.verifyStep,
            })
            .where({ id: verify.id })
            .execute();
    }

    public async getStuckJobs(
        verificationStatus: string,
        verifyStep: any,
        dbName: string,
    ) {
        const thirtySecsAgo = new Date().getTime() - 30000;
        const entityManager = await this.loadEntityManager(dbName);

        const verifyingResults = await entityManager
            .createQueryBuilder(CodeIdVerification, '_')
            .select('*')
            .where(
                `verification_status = '${verificationStatus}'
                AND verify_step ::jsonb @> \'${JSON.stringify(verifyStep)}\'`,
            )
            .getRawMany();

        const stuckVerifications = verifyingResults
            .filter(
                (verification) =>
                    verification.updated_at.getTime() <= thirtySecsAgo,
            )
            .map((verification) => verification.id);

        await entityManager
            .createQueryBuilder(CodeIdVerification, '_')
            .update(CodeIdVerification)
            .set({
                verificationStatus: VERIFICATION_STATUS.FAIL,
            })
            .whereInIds(stuckVerifications)
            .execute();

        return stuckVerifications;
    }

    private async loadEntityManager(systemId: string): Promise<EntityManager> {
        return this.moduleRef.get(
            getEntityManagerToken(`db-${systemId}`),
            {
                strict: false,
            },
        );
    }
}
