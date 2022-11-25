import { MODULE_REQUEST } from "src/module.config";
import { ResponseDto } from "../dtos/responses";

export interface IVerifyContractService {
    /**
     * 
     * @param request Request get data hash from code id
     */
    getDataHash(request: MODULE_REQUEST.GetDataHashRequest): Promise<ResponseDto>;

    /**
     * 
     * @param request Request verify source code
     */
    verifySourceCode(request: MODULE_REQUEST.VerifySourceCodeRequest): Promise<ResponseDto>;
}
