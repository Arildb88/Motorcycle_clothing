import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import {
  isAllowedCorsOrigin,
  parseCorsOrigins,
  securityHeaders,
} from './security/http-hardening';
import { SanitizeExceptionFilter } from './security/sanitize-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const nodeEnv = process.env.NODE_ENV;
  const extraOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      callback(null, isAllowedCorsOrigin(origin, { nodeEnv, extraOrigins }));
    },
    credentials: true,
  });
  app.use((_req: Request, res: Response, next: NextFunction) => {
    for (const [name, value] of Object.entries(securityHeaders(nodeEnv))) {
      res.setHeader(name, value);
    }
    next();
  });
  app.useGlobalFilters(new SanitizeExceptionFilter());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}/api`);
}
bootstrap();
