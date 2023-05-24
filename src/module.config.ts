import {
    GetDataHashRequest,
    UpdateVerifyStepRequest,
    VerifyContractJobRequest,
    VerifySourceCodeRequest,
} from './dtos/requests';
import { UpdateVerificationStatusRequest } from './dtos/requests/update-verification-status.request';
import { GetDataHashResponse, ResponseDto } from './dtos/responses';
import { VerifySourceCodeResponse } from './dtos/responses/verify-source-code.response';
import { Code, CodeIdVerification } from './entities';

export const ENTITIES_CONFIG = {
    CODE: Code,
    CODE_ID_VERIFICATION: CodeIdVerification,
};

export const SERVICE_INTERFACE = {
    IVERIFY_CONTRACT_SERVICE: 'IVerifyContractService',
};

export const REPOSITORY_INTERFACE = {
    ICODE_REPOSITORY: 'ICodeRepository',
    ICODE_ID_VERIFICATION_REPOSITORY: 'ICodeIdVerificationRepository',
};

export const PROVIDER_INTERFACE = {};

export const REQUEST_CONFIG = {
    GET_DATA_HASH: GetDataHashRequest,
    VERIFY_SOURCE_CODE: VerifySourceCodeRequest,
    VERIFY_CONTRACT_JOB: VerifyContractJobRequest,
    UPDATE_VERIFICATION_STATUS: UpdateVerificationStatusRequest,
    UPDATE_VERIFY_STEP: UpdateVerifyStepRequest,
};

export const RESPONSE_CONFIG = {
    RESPONSE_DTO: ResponseDto,
    GET_DATA_HASH: GetDataHashResponse,
    VERIFY_SOURCE_CODE: VerifySourceCodeResponse,
};

export namespace MODULE_REQUEST {
    export abstract class GetDataHashRequest extends REQUEST_CONFIG.GET_DATA_HASH {}
    export abstract class VerifySourceCodeRequest extends REQUEST_CONFIG.VERIFY_SOURCE_CODE {}
    export abstract class VerifyContractJobRequest extends REQUEST_CONFIG.VERIFY_CONTRACT_JOB {}
    export abstract class UpdateVerificationStatusRequest extends REQUEST_CONFIG.UPDATE_VERIFICATION_STATUS {}
    export abstract class UpdateVerifyStepRequest extends REQUEST_CONFIG.UPDATE_VERIFY_STEP {}
}

export namespace MODULE_RESPONSE {
    export abstract class ResponseDto extends RESPONSE_CONFIG.RESPONSE_DTO {}
    export abstract class GetDataHashResponse extends RESPONSE_CONFIG.GET_DATA_HASH {}
    export abstract class VerifySourceCodeResponse extends RESPONSE_CONFIG.VERIFY_SOURCE_CODE {}
}
