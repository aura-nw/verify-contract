import { ApiProperty } from "@nestjs/swagger";
import { IsJSON } from "class-validator";
import { VerifySourceCodeRequest } from "../requests";

export class VerifySourceCodeResponse {
    @IsJSON()
    @ApiProperty({
        example: {
            "codeId": 19,
            "commit": "string",
            "compilerVersion": "string",
            "contractAddress": "string",
            "contractUrl": "string",
            "wasmFile": "string"
        },
    })
    request: VerifySourceCodeRequest;
}
