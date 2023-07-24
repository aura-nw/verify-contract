import { Column, Entity } from 'typeorm';
import { BaseEntityAutoId } from './base/base.entity';

@Entity('code_id_verification')
export class CodeIdVerification extends BaseEntityAutoId {
    @Column({ name: 'code_id' })
    codeId: number;

    @Column({ name: 'data_hash' })
    dataHash: string;

    @Column({ name: 'instantiate_msg_schema', type: 'text', nullable: true })
    instantiateMsgSchema: string;

    @Column({ name: 'query_msg_schema', type: 'text', nullable: true })
    queryMsgSchema: string;

    @Column({ name: 'execute_msg_schema', type: 'text', nullable: true })
    executeMsgSchema: string;

    @Column({ name: 's3_location', nullable: true })
    s3Location: string;

    @Column({ name: 'verification_status', nullable: true })
    verificationStatus: string;

    @Column({ name: 'compiler_version', nullable: true })
    compilerVersion: string;

    @Column({ name: 'github_url', nullable: true })
    githubUrl: string;

    @Column({ name: 'verify_step', type: 'jsonb' })
    verifyStep: any;

    @Column({
        name: 'verified_at',
        type: 'timestamp',
        nullable: true,
    })
    verifiedAt: Date;
}
