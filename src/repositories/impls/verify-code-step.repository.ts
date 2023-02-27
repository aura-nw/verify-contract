import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from './base.repository';
import { ObjectLiteral, Repository } from 'typeorm';
import { ENTITIES_CONFIG } from '../../module.config';
import { IVerifyCodeStepRepository } from '../iverify-code-step.repository';
@Injectable()
export class VerifyCodeStepRepository
    extends BaseRepository
    implements IVerifyCodeStepRepository
{
    private readonly _logger = new Logger(VerifyCodeStepRepository.name);
    constructor(
        @InjectRepository(ENTITIES_CONFIG.VERIFY_CODE_STEP)
        private readonly repos: Repository<ObjectLiteral>,
    ) {
        super(repos);
    }
}
