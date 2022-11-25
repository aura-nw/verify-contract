import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { SmartContracts } from '../../entities';
import { VerifySourceCodeRequest } from './verify-source-code.request';

export class VerifyContractJobRequest {
    @ApiProperty()
    @IsNotEmpty()
    request: VerifySourceCodeRequest;

    @ApiProperty()
    @IsNotEmpty()
    contracts: SmartContracts[];
}