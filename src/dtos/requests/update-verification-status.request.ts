import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { VERIFICATION_STATUS } from '../../common';

export class UpdateVerificationStatusRequest {
    @ApiProperty()
    @IsNotEmpty()
    verificationStatus: VERIFICATION_STATUS;

    @ApiProperty()
    @IsNotEmpty()
    githubUrl: string;

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
