import { Module } from '@nestjs/common';
import { RecommendService } from './recommend.service';
import { RecommendController } from './recommend.controller';
import { ElevationModule } from '../elevation/elevation.module';
import { RoutesModule } from '../routes/routes.module';
import { RoutingModule } from '../routing/routing.module';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [RoutesModule, WeatherModule, RoutingModule, ElevationModule],
  providers: [RecommendService],
  controllers: [RecommendController],
  exports: [RecommendService],
})
export class RecommendModule {}
