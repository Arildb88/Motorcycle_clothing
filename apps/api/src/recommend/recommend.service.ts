import { Injectable, NotFoundException } from '@nestjs/common';
import { RoutesService } from '../routes/routes.service';
import { ComfortService } from '../comfort/comfort.service';
import { WeatherService } from '../weather/weather.service';
import { recommendClothing } from './clothing.engine';

@Injectable()
export class RecommendService {
  constructor(
    private readonly routes: RoutesService,
    private readonly comfort: ComfortService,
    private readonly weather: WeatherService,
  ) {}

  async forUser(userId: string, routeId?: string) {
    const route = routeId
      ? await this.routes.get(userId, routeId)
      : await this.routes.getDefault(userId);

    if (!route) {
      throw new NotFoundException(
        'No route found. Add a normal commute route first.',
      );
    }

    const comfort = await this.comfort.get(userId);
    const weather = await this.weather.forRoutePoints([
      { lat: route.startLat, lon: route.startLon },
      { lat: route.endLat, lon: route.endLon },
    ]);

    const recommendation = recommendClothing(weather, comfort);

    return {
      route: {
        id: route.id,
        name: route.name,
        isDefaultCommute: route.isDefaultCommute,
        startLabel: route.startLabel,
        endLabel: route.endLabel,
        typicalDurationMin: route.typicalDurationMin,
      },
      weather,
      comfort: {
        glovesBelowC: comfort.glovesBelowC,
        extraJacketLayerBelowC: comfort.extraJacketLayerBelowC,
        extraPantsLayerBelowC: comfort.extraPantsLayerBelowC,
        woolBaseBelowC: comfort.woolBaseBelowC,
        rainProbThreshold: comfort.rainProbThreshold,
        windChillSensitivity: comfort.windChillSensitivity,
        personalColdBiasC: comfort.personalColdBiasC,
      },
      recommendation,
    };
  }
}
