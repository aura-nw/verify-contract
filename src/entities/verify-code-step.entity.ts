import { Column, Entity, Unique } from 'typeorm';
import { VERIFY_CODE_RESULT } from '../common/constants/app.constant';
import { BaseEntityAutoId } from './base/base.entity';

@Entity({ name: 'verify_code_step' })
@Unique(['codeId', 'checkId'])
export class VerifyCodeStep extends BaseEntityAutoId {
    @Column({ name: 'code_id' })
    codeId: number;

    @Column({ name: 'check_id' })
    checkId: number;

    @Column({
        name: 'result',
        type: 'enum',
        enum: VERIFY_CODE_RESULT,
        default: VERIFY_CODE_RESULT.PENDING,
    })
    result: VERIFY_CODE_RESULT;

    @Column({ name: 'msg_code' })
    msgCode: string;
}
