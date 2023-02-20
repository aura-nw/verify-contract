import { Logger } from '@nestjs/common';
import { MODULE_REQUEST } from '../../module.config';
import * as fs from 'fs';
import { execSync } from 'child_process';
import Docker from 'dockerode';
import AWS from 'aws-sdk';
import {
    ISmartContractsRepository,
    IVerifyCodeStepRepository,
} from '../../../src/repositories';
import { SmartContracts, VerifyCodeStep } from '../../../src/entities';
import { CONTRACT_VERIFICATION, VERIFY_CODE_RESULT } from '../../../src/common';

export class CommonService {
    private readonly _logger = new Logger(CommonService.name);

    constructor() {}

    makeTempFile(): string {
        let dir = `temp/tempdir${new Date().getTime()}${Math.floor(
            Math.random() * 1000,
        )}`;
        try {
            fs.mkdir(dir, { recursive: true }, (err) => {
                if (err) throw err;
            });
        } catch (error) {
            return '';
        }

        return dir;
    }

    removeTempDir(dir: string) {
        try {
            execSync(`rm -rf ${dir}`);
            this._logger.log(`Remove temp dir ${dir}`, { stdio: 'inherit' });
        } catch (error) {
            this._logger.error(error);
        }
    }

    cloneAndCheckOutContract(
        clonePath: string,
        request: MODULE_REQUEST.VerifySourceCodeRequest,
    ): number {
        try {
            execSync(`git clone ${request.contractUrl} ${clonePath}`, {
                stdio: 'inherit',
            });
        } catch (error) {
            return 1;
        }
        try {
            execSync(`cd ${clonePath} && git checkout ${request.commit}`, {
                stdio: 'inherit',
            });
        } catch (error) {
            return 2;
        }
        if (!fs.existsSync(`${clonePath}/Cargo.lock`)) return 3;
    }

    async compileSourceCode(
        compilerImage: string,
        projectFolder: string,
        contractDir: string,
    ): Promise<boolean> {
        let docker;
        let optimize = compilerImage.match(process.env.WORKSPACE_REGEX)
            ? '/usr/local/bin/optimize_workspace.sh'
            : '/usr/local/bin/optimize.sh';
        let command = compilerImage.match(process.env.WORKSPACE_REGEX)
            ? `${optimize} . && cd ${contractDir}/ && cargo schema`
            : `${optimize} . && cargo schema`;
        try {
            docker = new Docker();
        } catch (error) {
            this._logger.error(error);
            return false;
        }

        try {
            execSync(`docker pull ${compilerImage}`, { stdio: 'inherit' });
        } catch (error) {
            this._logger.error(error);
            return false;
        }
        try {
            await docker.run(compilerImage, [], process.stdout, {
                Entrypoint: '/bin/sh',
                Cmd: ['-c', command],
                Volumes: {
                    registry_cache: {},
                },
                Hostconfig: {
                    autoRemove: true,
                    Binds: [
                        `${projectFolder}:/code`,
                        `${projectFolder}/target:/code/target`,
                        'registry_cache:/usr/local/cargo/registry',
                    ],
                },
            });
        } catch (error) {
            this._logger.error(error);
            return false;
        }
        return true;
    }

    async uploadContractToS3(zipDir: string, zipFile: string) {
        try {
            const s3 = new AWS.S3({
                region: process.env.AWS_REGION,
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            });
            const body = Buffer.from(fs.readFileSync(zipDir));
            const uploaded = await s3
                .upload({
                    Bucket: process.env.BUCKET_NAME,
                    Key: `${process.env.AWS_FOLDER}${zipFile}`,
                    Body: body,
                })
                .promise();
            this._logger.log(`Upload ${zipDir} to S3 with result ${uploaded}`);
            return uploaded.Location;
        } catch (error) {
            this._logger.error(error);
            return '';
        }
    }

    async updateVerifyStatus(
        verifyCodeStepRepository: IVerifyCodeStepRepository,
        codeId: number,
        checkId: number,
        result: VERIFY_CODE_RESULT,
        msgCode: string,
    ) {
        const resultCodeStep: VerifyCodeStep[] =
            await verifyCodeStepRepository.findByCondition({
                codeId,
                checkId,
            });

        const codeStep: VerifyCodeStep = resultCodeStep[0];
        codeStep.result = result;
        codeStep.msgCode = msgCode;

        await verifyCodeStepRepository.update(codeStep);
    }

    async updateContractVerifyStatus(
        smartContractsRepository: ISmartContractsRepository,
        codeId: number,
        verifyStatus: CONTRACT_VERIFICATION,
    ) {
        const contracts: SmartContracts[] =
            await smartContractsRepository.findByCondition({
                codeId,
            });

        contracts.map(
            (contract: SmartContracts) =>
                (contract.contractVerification = verifyStatus),
        );

        await smartContractsRepository.update(contracts);
    }
}
