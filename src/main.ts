import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
const Queue = require('bull');
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');

async function bootstrap() {
    let app;
    try {
        app = await NestFactory.create(AppModule);
    } catch (error) {
        console.log('Error in main.ts', error);
    }

    // setup swagger
    const config = new DocumentBuilder()
        .setTitle('Verify Contract Service of Aura Network')
        .setVersion('0.1')
        .addServer('/')
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('documentation', app, document);

    // setup bull board
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    const queueVerifyContract = new BullAdapter(Queue(
      'verify-source-code',
      `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}/${process.env.REDIS_DB}`,
      {
        prefix: 'verify-contract',
      }
    ));
    const queueDetectStuckJobs = new BullAdapter(Queue(
      'detect-stuck-jobs',
      `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}/${process.env.REDIS_DB}`,
      {
        prefix: 'verify-contract',
      }
    ));
    createBullBoard({
      queues: [queueVerifyContract, queueDetectStuckJobs],
      serverAdapter
    });
    app.use('/admin/queues', serverAdapter.getRouter());

    await app.listen(3000);
}
bootstrap();
