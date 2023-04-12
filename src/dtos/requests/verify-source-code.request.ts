import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class VerifySourceCodeRequest {
    @ApiProperty({
        required: false,
    })
    @IsNotEmpty()
    codeId: number;

    @ApiProperty()
    @IsNotEmpty()
    commit: string;

    @ApiProperty()
    @IsNotEmpty()
    compilerVersion: string;

    @ApiProperty()
    @IsNotEmpty()
    contractUrl: string;

    @ApiProperty()
    @IsNotEmpty()
    wasmFile: string;
}
