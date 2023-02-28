import { Column, Entity } from 'typeorm';
import { BaseEntityAutoId } from './base/base.entity';

@Entity('smart_contract_codes')
export class SmartContractCode extends BaseEntityAutoId {
    @Column({ name: 'code_id' })
    codeId: number;

    @Column()
    type: string;

    @Column()
    result: string;

    @Column()
    creator: string;

    @Column({ name: 'tx_hash', nullable: true })
    txHash: string;

    @Column({ name: 'instantiate_msg_schema', type: 'text', nullable: true })
    instantiateMsgSchema: string;

    @Column({ name: 'query_msg_schema', type: 'text', nullable: true })
    queryMsgSchema: string;

    @Column({ name: 'execute_msg_schema', type: 'text', nullable: true })
    executeMsgSchema: string;

    @Column({ name: 'contract_hash', nullable: true })
    contractHash: string;

    @Column({ name: 's3_location', nullable: true })
    s3Location: string;

    @Column({ name: 'contract_verification', nullable: true })
    contractVerification: string;

    @Column({ name: 'compiler_version', nullable: true })
    compilerVersion: string;

    @Column({ name: 'url', nullable: true })
    url: string;

    @Column({
        name: 'verified_at',
        type: 'timestamp',
        nullable: true,
    })
    verifiedAt: Date;
}
