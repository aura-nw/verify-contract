import { registerAs } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { DATABASE_TYPE } from '../constants/app.constant';
import { PascalCaseStrategy } from 'src/shared/pascalCase.strategy';

dotenv.config();

export const getHoroscopeDbNames = (): string[] => {
    return process.env.HOROSCOPE_DBS.split(',');
};

export default registerAs('orm', () => {
    const config = {};

    getHoroscopeDbNames().forEach((dbName) => {
        config[dbName] = {
            type: DATABASE_TYPE.POSTGRES,
            host: process.env[`DB_${dbName}_HOST`],
            port: parseInt(process.env[`DB_${dbName}_PORT`]),
            database: process.env[`DB_${dbName}_DATABASE`],
            username: process.env[`DB_${dbName}_USERNAME`],
            password: process.env[`DB_${dbName}_PASSWORD`],
            synchronize: process.env[`DB_${dbName}_SYNCHRONIZE`] === 'true',
            entities: [__dirname + '../../entities/**/*.entity{.ts,.js}'],
            namingStrategy: new PascalCaseStrategy(),
        };
    });

    return config;
});
