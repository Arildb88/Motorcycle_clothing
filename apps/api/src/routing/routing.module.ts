import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocationController } from './location.controller';
import { OrsGeocodingService } from './ors-geocoding.service';
import { OpenRouteServiceRoutingAdapter } from './ors-routing.adapter';
import { resolveOrsBaseUrl, resolvePeliasBaseUrl } from './ors.constants';
import { NullRoutingAdapter } from './null-routing.adapter';
import { ROUTING_PORT } from './routing.port';

function orsCredentials(config: ConfigService): { enabled: boolean; apiKey: string } {
  const provider = (config.get<string>('ROUTING_PROVIDER') ?? '').trim().toLowerCase();
  const apiKey = (config.get<string>('ORS_API_KEY') ?? '').trim();
  return { enabled: provider === 'ors' && apiKey.length > 0, apiKey };
}

@Module({
  controllers: [LocationController],
  providers: [
    {
      provide: OpenRouteServiceRoutingAdapter,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const { enabled, apiKey } = orsCredentials(config);
        return new OpenRouteServiceRoutingAdapter({
          apiKey: enabled ? apiKey : '',
          baseUrl: resolveOrsBaseUrl(config.get<string>('ORS_BASE_URL')),
        });
      },
    },
    {
      provide: ROUTING_PORT,
      inject: [OpenRouteServiceRoutingAdapter],
      useFactory: (ors: OpenRouteServiceRoutingAdapter) =>
        ors.isConfigured ? ors : new NullRoutingAdapter(),
    },
    {
      provide: OrsGeocodingService,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const { enabled, apiKey } = orsCredentials(config);
        return new OrsGeocodingService({
          apiKey: enabled ? apiKey : '',
          baseUrl: resolvePeliasBaseUrl(config.get<string>('ORS_GEOCODE_BASE_URL')),
        });
      },
    },
  ],
  exports: [ROUTING_PORT, OpenRouteServiceRoutingAdapter, OrsGeocodingService],
})
export class RoutingModule {}
