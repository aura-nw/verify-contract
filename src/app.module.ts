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
    CodeIdVerificationRepository,
    CodeRepository,
} from './repositories/impls';
import { DetectStuckJobsProcessor } from './processors/detect-stuck-jobs.processor';
const entities = [ENTITIES_CONFIG.CODE, ENTITIES_CONFIG.CODE_ID_VERIFICATION];
const controllers = [VerifyContractController];
const processors = [VerifyContractProcessor, DetectStuckJobsProcessor];
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
                removeOnFail: true,
                timeout: 30000000,
            },
            settings: {
                stalledInterval: 30000,
                maxStalledCount: 10,
            },
        }),
        BullModule.registerQueue(
            {
                name: 'verify-source-code',
            },
            {
                name: 'detect-stuck-jobs',
            }
        ),
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
            provide: REPOSITORY_INTERFACE.ICODE_ID_VERIFICATION_REPOSITORY,
            useClass: CodeIdVerificationRepository,
        },
        {
            provide: REPOSITORY_INTERFACE.ICODE_REPOSITORY,
            useClass: CodeRepository,
        },
        // processors
        ...processors,
    ],
})
export class AppModule {}
