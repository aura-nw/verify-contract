import { PaginatorResponse } from '../dtos/responses';
import { DeleteResult } from 'typeorm';

export interface IBaseRepository {
    /**
     * findOne
     * @param id
     */
    findOne(id: any): Promise<any>;

    /**
     * findByCondition
     * @param filterCondition
     * @param orderBy
     */
    findByCondition(filterCondition: any, orderBy?: any): Promise<any[]>;

    /**
     * findAll
     * @param orderBy
     */
    findAll(orderBy?: any): Promise<any[]>;

    /**
     * findWithRelations
     * @param relations
     */
    findWithRelations(relations: any): Promise<any[]>;

    /**
     * findAndCount
     * @param pageIndex
     * @param pageSize
     * @param condition
     * @param orderBy
     */
    findAndCount(
        pageIndex: number,
        pageSize: number,
        condition: any,
        orderBy: any,
    ): Promise<PaginatorResponse>;

    /**
     * create
     * @param data
     */
    create(data: any | any): Promise<any>;

    /**
     * update
     * @param data
     */
    update(data: any | any): Promise<any>;

    /**
     * updateByCondition
     * @param condition
     * @param data
     */
    updateByCondition(condition: any | any, data: any | any): Promise<any>;

    /**
     * remove
     * @param id
     */
    remove(id: any): Promise<DeleteResult>;
}
