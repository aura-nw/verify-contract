import { Column, Entity } from 'typeorm';
import { BaseEntityAutoId } from './base/base.entity';

export interface IInstantiatePermission {
    permission: string;
    address: string;
    addresses: string[];
}

@Entity('code')
export class Code extends BaseEntityAutoId {
    @Column({ name: 'code_id' })
    codeId: number;

    @Column()
    creator: string;

    @Column({ name: 'data_hash' })
    dataHash: string;

    @Column({ name: 'instantiate_permission', type: 'jsonb' })
    instantiatePermission: IInstantiatePermission;

    @Column({ nullable: true })
    type: string;

    @Column({ nullable: true })
    status: string;

    @Column({ name: 'store_hash' })
    storeHash: string;

    @Column({ name: 'store_height' })
    storeHeight: number;
}
