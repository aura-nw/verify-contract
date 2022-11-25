import {
    CreateDateColumn,
    PrimaryColumn,
    UpdateDateColumn,
    Column,
    PrimaryGeneratedColumn,
} from 'typeorm';

export class BaseEntity {
    @CreateDateColumn({
        type: 'timestamp',
        name: 'created_at',
    })
    createdAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        name: 'updated_at',
    })
    updatedAt: Date;
}
export class BaseEntityId extends BaseEntity {
    @PrimaryColumn({ name: 'id' })
    id: string;
}
export class BaseEntityAutoId extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { name: 'id' })
    id: number;
}
