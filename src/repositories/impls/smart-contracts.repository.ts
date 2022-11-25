import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from './base.repository';
import { ObjectLiteral, Repository } from 'typeorm';
import { ENTITIES_CONFIG } from '../../module.config';
import { ISmartContractsRepository } from '../ismart-contracts.repository';
@Injectable()
export class SmartContractsRepository
    extends BaseRepository
    implements ISmartContractsRepository
{
    private readonly _logger = new Logger(SmartContractsRepository.name);
    constructor(
        @InjectRepository(ENTITIES_CONFIG.SMART_CONTRACTS)
        private readonly repos: Repository<ObjectLiteral>,
    ) {
        super(repos);
    }
}
