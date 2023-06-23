import { OnQueueActive, OnQueueCompleted, OnQueueError, OnQueueFailed, Process, Processor } from "@nestjs/bull";
import { Inject, Logger } from "@nestjs/common";
import { REPOSITORY_INTERFACE } from "../module.config";
import { ICodeIdVerificationRepository } from "../repositories";
import { RedisService } from "../shared/services";
import { ErrorMap, VERIFICATION_STATUS, VERIFY_CODE_RESULT, VERIFY_STEP_CHECK_ID } from "../common";
import { LessThanOrEqual } from "typeorm";
import { CodeIdVerification } from "../entities";
import { Job } from "bull";

@Processor('detect-stuck-jobs')
export class DetectStuckJobsProcessor {
    private readonly _logger = new Logger(DetectStuckJobsProcessor.name);
    private redisService = new RedisService();
    private ioredis;

    constructor(
        @Inject(REPOSITORY_INTERFACE.ICODE_ID_VERIFICATION_REPOSITORY)
        private codeIdVerificationRepository: ICodeIdVerificationRepository,
    ) {
        this._logger.log(
            '============== Constructor Detect Stuck Jobs Processor Service ==============',
        );
        this.ioredis = this.redisService.getIoRedis(this.ioredis);
    }

    @Process({
        name: 'get-stuck-jobs'
    })
    async detectStuckJobs() {
        const stuckVerifications = await this.codeIdVerificationRepository.getStuckJobs(
            VERIFICATION_STATUS.VERIFYING,
            {
                step: VERIFY_STEP_CHECK_ID.GET_DATA_HASH,
                result: VERIFY_CODE_RESULT.SUCCESS,
                msg_code: ErrorMap.GET_DATA_HASH_SUCCESSFUL.Code,
            }
        );

        stuckVerifications
            .map(verification => {
                this.ioredis.publish(
                    process.env.REDIS_CHANNEL,
                    JSON.stringify({
                        Code: ErrorMap.CANNOT_PROCESS.Code,
                        Message: ErrorMap.CANNOT_PROCESS.Message,
                        CodeId: verification.codeId,
                        Verified: false,
                    }),
                );
            });
    }

    @OnQueueActive()
    onActive(job: Job) {
        this._logger.log(`Processing job ${job.id} of type ${job.name}...`);
    }

    @OnQueueCompleted()
    onComplete(job: Job, result: any) {
        this._logger.log(`Completed job ${job.id} of type ${job.name}`);
        this._logger.log(`Result: ${result}`);
    }

    @OnQueueError()
    async onError(error: Error) {
        this._logger.error(`Error: ${error}`);
    }

    @OnQueueFailed()
    async onFailed(job: Job, error: Error) {
        this._logger.error(`Failed job ${job.id} of type ${job.name}`);
        this._logger.error(`Error: ${error}`);
    }
}