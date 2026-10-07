import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`银龄志愿服务平台后端已启动: http://localhost:${port}/api`);
}
bootstrap();
