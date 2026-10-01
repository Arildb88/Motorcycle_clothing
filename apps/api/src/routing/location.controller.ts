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
      return hits.map((hit) => ({
        providerPlaceId: hit.providerPlaceId,
        primaryText: hit.primaryText,
        secondaryText: hit.secondaryText,
      }));
    } catch (err) {
      throw geocodingUnavailable(err);
    }
  }

  @Post('places/resolve')
  async resolve(@Body() dto: ResolvePlaceDto) {
    try {
      const place = await this.geocoding.resolve(dto.providerPlaceId);
      if (!place) throw new NotFoundException('Place not found');
      return {
        providerPlaceId: place.providerPlaceId,
        label: place.label,
        lat: place.lat,
        lon: place.lon,
        address: place.address,
      };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw geocodingUnavailable(err);
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

function geocodingUnavailable(err: unknown): ServiceUnavailableException {
  if (err instanceof GeocodingUnavailableError) {
    return new ServiceUnavailableException({
      statusCode: 503,
      code: 'GEOCODING_UNAVAILABLE',
      message:
        err.reason === 'not_configured'
          ? 'Place search is not configured on the server.'
          : 'Place search is temporarily unavailable.',
      error: 'Service Unavailable',
    });
  }
  return new ServiceUnavailableException({
    statusCode: 503,
    code: 'GEOCODING_UNAVAILABLE',
    message: 'Place search is temporarily unavailable.',
    error: 'Service Unavailable',
  });
}
