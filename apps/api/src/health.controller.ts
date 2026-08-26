import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'motorcycle-clothing-api',
      env: process.env.NODE_ENV ?? 'development',
      weatherProvider: process.env.WEATHER_PROVIDER ?? 'mock',
    };
  }
}
