import { MODULE_REQUEST } from '../module.config';
import { IBaseRepository } from './ibase.repository';

export interface ICodeIdVerificationRepository extends IBaseRepository {
    /**
     * Update code_id_verification verification info based on dataHash or codeId
     * @param dataHash
     * @param codeId
     * @param verifiedInfo
     */
    updateVerificationStatus(
        dataHash: string,
        codeId: number,
        verifiedInfo: MODULE_REQUEST.UpdateVerificationStatusRequest,
    );

    /**
     * Update code_id_verification verify step
     * @param verificationStatus
     * @param verifyStep
     */
    updateVerifyStep(
        id: number,
        codeId: number,
        verifyStep: MODULE_REQUEST.UpdateVerifyStepRequest,
        verificationStatus?: string,
    );

    /**
     * Handle when job failed or error
     * @param codeId
     */
    handleJobCrash(codeId: number);
}
