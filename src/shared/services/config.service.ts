import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { DATABASE_TYPE } from '../../common/constants/app.constant';
import { PascalCaseStrategy } from '../pascalCase.strategy';

export class ConfigService {
    constructor() {
        dotenv.config({
            path: `.env`,
        });

        // Replace \\n with \n to support multiline strings in AWS
        for (const envName of Object.keys(process.env)) {
            process.env[envName] = process.env[envName].replace(/\\n/g, '\n');
        }
    }

    get isDevelopment(): boolean {
        return this.nodeEnv === 'development';
    }

    get isProduction(): boolean {
        return this.nodeEnv === 'production';
    }

    public get(key: string): string {
        return process.env[key];
    }

    public getNumber(key: string): number {
        return Number(this.get(key));
    }

    get nodeEnv(): string {
        return this.get('NODE_ENV') || 'development';
    }

    get timezone(): string {
        return this.get('APP_TIMEZONE');
    }

    get ENV_CONFIG() {
        return {};
    }

    get typeOrmConfig(): TypeOrmModuleOptions {
        const entities = [__dirname + '/../../entities/**/*.entity{.ts,.js}'];
        const migrations = [__dirname + '/../../migrations/*{.ts,.js}'];

        return {
            entities,
            // migrations,
            type: DATABASE_TYPE.MYSQL,
            host: this.get('DB_HOST'),
            port: this.getNumber('DB_PORT'),
            username: this.get('DB_USERNAME'),
            password: this.get('DB_PASSWORD'),
            database: this.get('DB_DATABASE'),
            migrationsRun: true,
            connectTimeout: 60000,
            logging: this.nodeEnv === 'development',
            namingStrategy: new PascalCaseStrategy(),
            multipleStatements: true,
        };
    }
}

export const ENV_CONFIG = new ConfigService().ENV_CONFIG;
