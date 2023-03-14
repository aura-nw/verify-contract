import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { CONTRACT_VERIFICATION } from 'src/common';

export class UpdateVerificationStatusRequest {
    @ApiProperty()
    @IsNotEmpty()
    contractVerification: CONTRACT_VERIFICATION;

    @ApiProperty()
    @IsNotEmpty()
    url: string;

    @ApiProperty()
    @IsNotEmpty()
    compilerVersion: string;

    @ApiProperty()
    @IsNotEmpty()
    instantiateMsgSchema: string;

    @ApiProperty()
    @IsNotEmpty()
    queryMsgSchema: string;

    @ApiProperty()
    @IsNotEmpty()
    executeMsgSchema: string;

    @ApiProperty()
    @IsNotEmpty()
    s3Location: string;

    @ApiProperty()
    @IsNotEmpty()
    verifiedAt: Date;
}
