import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('weather')
@UseGuards(JwtAuthGuard)
export class WeatherController {
  constructor(private readonly weather: WeatherService) {}

  @Get('point')
  point(@Query('lat') lat: string, @Query('lon') lon: string) {
    return this.weather.forRoutePoints([
      { lat: Number(lat), lon: Number(lon) },
    ]);
  }
}
