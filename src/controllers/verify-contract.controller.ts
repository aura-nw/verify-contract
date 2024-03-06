import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Inject,
    Param,
    Post,
} from '@nestjs/common';
import {
    MODULE_REQUEST,
    MODULE_RESPONSE,
    SERVICE_INTERFACE,
} from '../module.config';
import { IVerifyContractService } from '../services/iverify-contract.service';
import {
    ApiBadRequestResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import { API_CONSTANTS } from '../common';

@Controller('smart-contract')
@ApiTags('smart-contract')
export class VerifyContractController {
    constructor(
        @Inject(SERVICE_INTERFACE.IVERIFY_CONTRACT_SERVICE)
        private readonly verifyContractService: IVerifyContractService,
    ) {}

    @Get(API_CONSTANTS.GET_DATA_HASH)
    @ApiOperation({ summary: 'Get data hash of code id' })
    @ApiOkResponse({
        status: 200,
        type: MODULE_RESPONSE.GetDataHashResponse,
        description: 'Return data hash of a code id',
        schema: {},
    })
    @ApiBadRequestResponse({ description: 'Error: Bad Request', schema: {} })
    @HttpCode(HttpStatus.OK)
    async getDataHash(@Param() request: MODULE_REQUEST.GetDataHashRequest) {
        return this.verifyContractService.getDataHash(request);
    }

    @Post(API_CONSTANTS.VERIFY)
    @ApiOperation({ summary: 'Verify source code of a code id' })
    @ApiOkResponse({
        status: 200,
        type: MODULE_RESPONSE.VerifySourceCodeResponse,
        description:
            'Compare the provided source code with the source code on the blockchain',
        schema: {},
    })
    @ApiBadRequestResponse({ description: 'Error: Bad Request', schema: {} })
    @HttpCode(HttpStatus.OK)
    async verify(@Body() request: MODULE_REQUEST.VerifySourceCodeRequest) {
        return this.verifyContractService.verifySourceCode(request);
    }
}
