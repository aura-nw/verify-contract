import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class VerifySourceCodeRequest {
    @ApiProperty({
        required: false
    })
    @IsOptional()
    codeId: number;

    @ApiProperty({
        required: false
    })
    @IsOptional()
    contractAddress: string;

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