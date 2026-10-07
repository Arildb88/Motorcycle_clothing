import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Post,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { parseRoutePreferences } from '../domain/ride-planning';
import { ResolvePlaceDto, RoutePreviewDto } from './dto/location.dto';
import {
  GeocodingUnavailableError,
  OrsGeocodingService,
  placeSearchHit,
} from './ors-geocoding.service';
import { OpenRouteServiceRoutingAdapter } from './ors-routing.adapter';

@Controller('location')
@UseGuards(JwtAuthGuard)
export class LocationController {
  constructor(
    private readonly geocoding: OrsGeocodingService,
    @Inject(OpenRouteServiceRoutingAdapter)
    private readonly routing: OpenRouteServiceRoutingAdapter,
  ) {}

  @Get('places')
  async places(@Query('q') q = '') {
    try {
      const hits = await this.geocoding.autocomplete(q ?? '');
      return hits.map(placeSearchHit);
    } catch (err) {
      throw geocodingHttpException(err);
    }
  }

  @Post('places/resolve')
  async resolve(@Body() dto: ResolvePlaceDto) {
    try {
      const place = await this.geocoding.resolve(dto.providerPlaceId);
      if (!place) throw placeNotFound();
      return {
        providerPlaceId: place.providerPlaceId,
        label: place.label,
        lat: place.lat,
        lon: place.lon,
        address: place.address,
      };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw geocodingHttpException(err);
    }
  }

  @Post('route-preview')
  async routePreview(@Body() dto: RoutePreviewDto) {
    if (!this.routing.isConfigured) {
      throw routingUnavailable('Road routing is not configured on the server.');
    }
    const preview = await this.routing.preview({
      waypoints: dto.waypoints.map((point) => ({ lat: point.lat, lon: point.lon })),
      preferences: parseRoutePreferences({
        avoidMotorways: dto.avoidMotorways === true,
      }),
      travelProfile: 'drive',
    });
    if (!preview) {
      throw routingUnavailable('Road routing is temporarily unavailable.');
    }
    return preview;
  }
}

function routingUnavailable(message: string): ServiceUnavailableException {
  return new ServiceUnavailableException({
    statusCode: 503,
    code: 'ROUTING_UNAVAILABLE',
    message,
    error: 'Service Unavailable',
  });
}

export function geocodingHttpException(err: unknown) {
  if (err instanceof GeocodingUnavailableError) {
    if (err.reason === 'not_configured' || err.reason === 'authentication') {
      return new ServiceUnavailableException({
        statusCode: 503,
        code: 'GEOCODING_NOT_CONFIGURED',
        message: 'Place search is not configured on the server.',
        error: 'Service Unavailable',
      });
    }
    if (err.reason === 'not_found') return placeNotFound();
  }
  return new ServiceUnavailableException({
    statusCode: 503,
    code: 'GEOCODING_UNAVAILABLE',
    message: 'Place search is temporarily unavailable.',
    error: 'Service Unavailable',
  });
}

function placeNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: 'PLACE_NOT_FOUND',
    message: 'Place was not found.',
    error: 'Not Found',
  });
}
