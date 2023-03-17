import { MODULE_REQUEST } from '../module.config';
import { IBaseRepository } from './ibase.repository';

export interface ISmartContractCodeRepository extends IBaseRepository {
    /**
     * Update smart_contract_code verification info based on contractHash or codeId
     * @param contractHash
     * @param codeId
     * @param verifiedInfo
     */
    updateVerificationStatus(
        contractHash: string,
        codeId: number,
        verifiedInfo: MODULE_REQUEST.UpdateVerificationStatusRequest,
    );
}
