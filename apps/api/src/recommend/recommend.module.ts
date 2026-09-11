import { Module } from '@nestjs/common';
import { RecommendService } from './recommend.service';
import { RecommendController } from './recommend.controller';
import { RoutesModule } from '../routes/routes.module';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [RoutesModule, WeatherModule],
  providers: [RecommendService],
  controllers: [RecommendController],
  exports: [RecommendService],
})
export class RecommendModule {}
