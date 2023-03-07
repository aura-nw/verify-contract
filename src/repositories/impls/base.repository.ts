import { DeleteResult, Repository } from 'typeorm';
import { IBaseRepository } from '../ibase.repository';
import { PaginatorResponse } from '../../dtos/responses';
import { Logger } from '@nestjs/common';

export class BaseRepository implements IBaseRepository {
    private _repos: Repository<any>;
    private _log = new Logger(BaseRepository.name);

    public constructor(repos) {
        this._repos = repos;
    }

    /**
     * findOne
     * @param condition
     * @returns
     */
    public async findOne(id: any): Promise<any> {
        this._log.log(
            `============== Call method findOne width parameters:${id} ==============`,
        );
        return await this._repos.findOne(id);
    }

    /**
     * findByCondition
     * @param condition
     * @param orderBy
     * @returns
     */
    public async findByCondition(
        condition: any,
        orderBy?: any,
    ): Promise<any[]> {
        this._log.log(
            `============== Call method findOne width parameters: condition:${this.convertObjectToJson(
                condition,
            )}, orderBy: ${this.convertObjectToJson(orderBy)} ==============`,
        );
        const opt = { where: condition };
        if (orderBy) {
            opt['order'] = orderBy;
        }
        return await this._repos.find(opt);
    }

    /**
     * findWithRelations
     * @param relations
     * @returns
     */
    public async findWithRelations(relations: any): Promise<any[]> {
        return await this._repos.find(relations);
    }

    /**
     * findAll
     * @param orderBy
     * @returns
     */
    public async findAll(orderBy?: any): Promise<any[]> {
        if (orderBy) {
            return await this._repos.find({ order: orderBy });
        } else {
            return await this._repos.find();
        }
    }

    /**
     * findAndCount
     * @param pageIndex
     * @param pageSize
     * @param condition
     * @param orderBy
     * @returns
     */
    public async findAndCount(
        pageIndex: number,
        pageSize: number,
        condition: any = null,
        orderBy: any = null,
    ): Promise<PaginatorResponse> {
        const opt = {};
        const paginatorResponse = new PaginatorResponse();

        if (condition) {
            opt['where'] = condition;
        }

        opt['take'] = pageSize;
        opt['skip'] = pageSize * pageIndex;

        if (orderBy) {
            opt['order'] = orderBy;
        }

        const [result, totalRecord] = await this._repos.findAndCount(opt);
        paginatorResponse.pageIndex = pageIndex;
        paginatorResponse.pageSize = pageSize;
        paginatorResponse.pageResults = result;
        paginatorResponse.totalRecord = totalRecord;

        return paginatorResponse;
    }

    /**
     * create
     * @param data
     * @returns
     */
    public async create(data: any): Promise<any> {
        return await this._repos.save(data);
    }

    /**
     * update
     * @param data
     * @returns
     */
    public async update(data: any): Promise<any> {
        return await this._repos.save(data);
    }

    /**
     * updateById
     * @param condition
     * @param data
     * @returns
     */
    public async updateByCondition(condition: any, data: any): Promise<any> {
        return await this._repos.update(condition, data);
    }

    /**
     * remove
     * @param id
     * @returns
     */
    public async remove(id: any): Promise<DeleteResult> {
        const entity = await this.findOne(id);
        return await this._repos.delete(entity);
    }

    private convertObjectToJson(obj: any) {
        return JSON.stringify(obj);
    }
}
