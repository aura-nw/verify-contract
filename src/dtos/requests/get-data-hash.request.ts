import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class GetDataHashRequest {
    @ApiProperty()
    @IsNotEmpty()
    codeId: number;
}