import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UpdateVerifyStepRequest {
    @ApiProperty()
    @IsNotEmpty()
    step: number;

    @ApiProperty()
    @IsNotEmpty()
    result: string;

    @ApiProperty()
    @IsNotEmpty()
    msg_code: string;
}
