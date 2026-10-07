import { Module } from '@nestjs/common';
import { RecommendService } from './recommend.service';
import { RecommendController } from './recommend.controller';
import { ElevationModule } from '../elevation/elevation.module';
import { CommutePlanController } from '../routes/commute-plan.controller';
import { CommutePlanService } from '../routes/commute-plan.service';
import { RoutesModule } from '../routes/routes.module';
import { RoutingModule } from '../routing/routing.module';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [RoutesModule, WeatherModule, RoutingModule, ElevationModule],
  providers: [RecommendService, CommutePlanService],
  controllers: [RecommendController, CommutePlanController],
  exports: [RecommendService],
})
export class RecommendModule {}
