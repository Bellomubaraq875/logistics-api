import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Proof-of-delivery files (swap for Cloudinary/S3 in production, see README)
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  await app.listen(process.env.PORT || 4000);
}
bootstrap();
