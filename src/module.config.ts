import {
    GetDataHashRequest,
    VerifyContractJobRequest,
    VerifySourceCodeRequest,
} from './dtos/requests';
import { GetDataHashResponse, ResponseDto } from './dtos/responses';
import { VerifySourceCodeResponse } from './dtos/responses/verify-source-code.response';
import { SmartContracts, VerifyCodeStep, VerifyItemCheck } from './entities';

export const ENTITIES_CONFIG = {
    SMART_CONTRACTS: SmartContracts,
    VERIFY_CODE_STEP: VerifyCodeStep,
    VERIFY_ITEM_CHECK: VerifyItemCheck,
};

export const SERVICE_INTERFACE = {
    IVERIFY_CONTRACT_SERVICE: 'IVerifyContractService',
};

export const REPOSITORY_INTERFACE = {
    ISMART_CONTRACTS_REPOSITORY: 'ISmartContractsRepository',
    IVERIFY_CODE_STEP_REPOSITORY: 'IVerifyCodeStepRepository',
    IVERIFY_ITEM_CHECK_REPOSITORY: 'IVerifyItemCheckRepository',
};

export const PROVIDER_INTERFACE = {};

export const REQUEST_CONFIG = {
    GET_DATA_HASH: GetDataHashRequest,
    VERIFY_SOURCE_CODE: VerifySourceCodeRequest,
    VERIFY_CONTRACT_JOB: VerifyContractJobRequest,
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
}

export namespace MODULE_RESPONSE {
    export abstract class ResponseDto extends RESPONSE_CONFIG.RESPONSE_DTO {}
    export abstract class GetDataHashResponse extends RESPONSE_CONFIG.GET_DATA_HASH {}
    export abstract class VerifySourceCodeResponse extends RESPONSE_CONFIG.VERIFY_SOURCE_CODE {}
}
