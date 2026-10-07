import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  // 支持 base64 照片上传
  app.use(json({ limit: '8mb' }));
  app.use(urlencoded({ limit: '8mb', extended: true }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        const msg = errors
          .map((e) => Object.values(e.constraints || {}).join('；'))
          .filter(Boolean)
          .join('；');
        return new BadRequestException({ code: 400, message: msg || '参数错误' });
      },
    }),
  );
  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`银龄志愿服务平台后端已启动: http://localhost:${port}/api`);
}
bootstrap();
