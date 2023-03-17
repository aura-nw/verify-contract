import { Column, Entity } from 'typeorm';
import { BaseEntityAutoId } from './base/base.entity';

@Entity({ name: 'smart_contracts' })
export class SmartContracts extends BaseEntityAutoId {
    @Column({
        name: 'verified_at',
        type: 'timestamp',
    })
    verifiedAt: Date;

    @Column({ name: 'height' })
    height: number;

    @Column({ name: 'code_id' })
    codeId: number;

    @Column({ name: 'contract_name' })
    contractName: string;

    @Column({ name: 'contract_address' })
    contractAddress: string;

    @Column({ name: 'creator_address' })
    creatorAddress: string;

    @Column({ name: 'contract_hash' })
    contractHash: string;

    @Column({ name: 'tx_hash' })
    txHash: string;

    @Column({ name: 'url' })
    url: string;

    @Column({ 
        name: 'instantiate_msg_schema',
        type: 'text' 
    })
    instantiateMsgSchema: string;

    @Column({ 
        name: 'query_msg_schema',
        type: 'text' 
    })
    queryMsgSchema: string;

    @Column({ 
        name: 'execute_msg_schema',
        type: 'text' 
    })
    executeMsgSchema: string;

    @Column({ name: 'contract_match' })
    contractMatch: string;

    @Column({ name: 'contract_verification' })
    contractVerification: string;

    @Column({ name: 'compiler_version' })
    compilerVersion: string;

    @Column({ name: 's3_location' })
    s3Location: string;

    @Column({ name: 'reference_code_id' })
    referenceCodeId: number;

    @Column({ name: 'mainnet_upload_status' })
    mainnetUploadStatus: string;

    @Column({ name: 'token_name' })
    tokenName: string;

    @Column({ name: 'token_symbol' })
    tokenSymbol: string;

    @Column({ name: 'num_tokens' })
    numTokens: number;

    @Column({
        name: 'project_name',
        nullable: true,
    })
    projectName: string;

    @Column({
        name: 'request_id',
        nullable: true,
    })
    requestId: number;
}
