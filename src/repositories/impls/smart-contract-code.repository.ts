import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from './base.repository';
import { ObjectLiteral, Repository } from 'typeorm';
import { ENTITIES_CONFIG } from '../../module.config';
import { ISmartContractCodeRepository } from '../ismart-contract-code.repository';
@Injectable()
export class SmartContractCodeRepository
    extends BaseRepository
    implements ISmartContractCodeRepository
{
    private readonly _logger = new Logger(SmartContractCodeRepository.name);
    constructor(
        @InjectRepository(ENTITIES_CONFIG.SMART_CONTRACT_CODE)
        private readonly repos: Repository<ObjectLiteral>,
    ) {
        super(repos);
    }
}
