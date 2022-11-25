import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

    await app.listen(3000);
}
bootstrap();
