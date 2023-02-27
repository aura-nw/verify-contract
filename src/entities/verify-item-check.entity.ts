import { Column, Entity } from 'typeorm';
import { BaseEntityAutoId } from './base/base.entity';

@Entity({ name: 'verify_item_check' })
export class VerifyItemCheck extends BaseEntityAutoId {
    @Column({ name: 'check_name' })
    checkName: string;

    @Column({ name: 'group_stage' })
    groupStage: number;
}
