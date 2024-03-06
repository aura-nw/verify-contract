import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, getEntityManagerToken } from '@nestjs/typeorm';
import { BaseRepository } from './base.repository';
import { EntityManager, ObjectLiteral, Repository } from 'typeorm';
import { ENTITIES_CONFIG } from '../../module.config';
import { ICodeRepository } from '../icode.repository';
import { ModuleRef } from '@nestjs/core';
@Injectable()
//  extends BaseRepository implements ICodeRepository
export class CodeRepository {
    constructor(private moduleRef: ModuleRef) {}
    private async loadEntityManager(dbName: string): Promise<EntityManager> {
        return this.moduleRef.get(getEntityManagerToken(`db-${dbName}`), {
            strict: false,
        });
    }
}
