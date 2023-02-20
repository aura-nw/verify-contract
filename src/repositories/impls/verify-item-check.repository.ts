import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from './base.repository';
import { ObjectLiteral, Repository } from 'typeorm';
import { ENTITIES_CONFIG } from '../../module.config';
import { IVerifyItemCheckRepository } from '../iverify-item-check.repository';
@Injectable()
export class VerifyItemCheckRepository
    extends BaseRepository
    implements IVerifyItemCheckRepository
{
    private readonly _logger = new Logger(VerifyItemCheckRepository.name);
    constructor(
        @InjectRepository(ENTITIES_CONFIG.VERIFY_ITEM_CHECK)
        private readonly repos: Repository<ObjectLiteral>,
    ) {
        super(repos);
    }
}
