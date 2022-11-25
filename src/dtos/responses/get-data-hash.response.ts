import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class GetDataHashResponse {
    @IsString()
    @ApiProperty({
        example: '97338ce6ecb1552e814d14fca3bded44a4fdf536422da44f8cda4c9d22090b42',
    })
    data_hash: string;
}
