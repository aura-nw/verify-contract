import { Global, Module } from '@nestjs/common';
import {
    ENTITIES_CONFIG,
    REPOSITORY_INTERFACE,
    SERVICE_INTERFACE,
} from './module.config';
import { SharedModule } from './shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService, RedisService, CommonService } from './shared/services';
import { VerifyContractService } from './services/impls';
import { HttpModule } from '@nestjs/axios';
import { VerifyContractController } from './controllers/verify-contract.controller';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { VerifyContractProcessor } from './processors/verify-contract.processor';
import {
    SmartContractCodeRepository,
    SmartContractsRepository,
    VerifyCodeStepRepository,
    VerifyItemCheckRepository,
} from './repositories/impls';
const entities = [
    ENTITIES_CONFIG.SMART_CONTRACTS,
    ENTITIES_CONFIG.SMART_CONTRACT_CODE,
    ENTITIES_CONFIG.VERIFY_CODE_STEP,
    ENTITIES_CONFIG.VERIFY_ITEM_CHECK,
];
const controllers = [VerifyContractController];
const processors = [VerifyContractProcessor];
// @Global()
@Module({
    imports: [
        ConfigModule.forRoot(),
        SharedModule,
        TypeOrmModule.forRootAsync({
            imports: [SharedModule, AppModule],
            useFactory: (configService: ConfigService) =>
                configService.typeOrmConfig,
            inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([...entities]),
        HttpModule,
        BullModule.forRoot({
            redis: {
                host: process.env.REDIS_HOST,
                port: parseInt(process.env.REDIS_PORT, 10),
                username: process.env.REDIS_USERNAME,
                db: parseInt(process.env.REDIS_DB, 10),
            },
            prefix: 'verify-contract',
            defaultJobOptions: {
                removeOnComplete: true,
                attempts: 3,
            },
        }),
        BullModule.registerQueue({
            name: 'verify-source-code',
        }),
        RedisService,
        CommonService,
    ],
    exports: [BullModule, ...processors],
    controllers: [...controllers],
    providers: [
        // services
        {
            provide: SERVICE_INTERFACE.IVERIFY_CONTRACT_SERVICE,
            useClass: VerifyContractService,
        },
        RedisService,
        CommonService,
        // repositories
        {
            provide: REPOSITORY_INTERFACE.ISMART_CONTRACTS_REPOSITORY,
            useClass: SmartContractsRepository,
        },
        {
            provide: REPOSITORY_INTERFACE.ISMART_CONTRACT_CODE_REPOSITORY,
            useClass: SmartContractCodeRepository,
        },
        {
            provide: REPOSITORY_INTERFACE.IVERIFY_CODE_STEP_REPOSITORY,
            useClass: VerifyCodeStepRepository,
        },
        {
            provide: REPOSITORY_INTERFACE.IVERIFY_ITEM_CHECK_REPOSITORY,
            useClass: VerifyItemCheckRepository,
        },
        // processors
        ...processors,
    ],
})
export class AppModule {}
