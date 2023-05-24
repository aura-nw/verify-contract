import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from './base.repository';
import { ObjectLiteral, Repository } from 'typeorm';
import { ENTITIES_CONFIG } from '../../module.config';
import { ICodeRepository } from '../icode.repository';
@Injectable()
export class CodeRepository extends BaseRepository implements ICodeRepository {
    private readonly _logger = new Logger(CodeRepository.name);
    constructor(
        @InjectRepository(ENTITIES_CONFIG.CODE)
        private readonly repos: Repository<ObjectLiteral>,
    ) {
        super(repos);
    }
}
