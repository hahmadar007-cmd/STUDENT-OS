// ============================================================================
// Copyright (c) 2025 hahmadar007-cmd. All Rights Reserved.
// STUDENT-OS — Proprietary & Confidential Software.
// Unauthorized copying, modification, distribution, or use of this file,
// via any medium, is strictly prohibited and punishable by law.
// See LICENSE file for full legal terms and penalties.
// ============================================================================

import './utils/load-env';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Enable CORS for frontend requests
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}

bootstrap();
