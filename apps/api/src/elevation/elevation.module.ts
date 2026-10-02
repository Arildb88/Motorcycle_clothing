import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ELEVATION_PORT } from './elevation.port';
import { KartverketElevationAdapter } from './kartverket-elevation.adapter';
import { NullElevationAdapter } from './null-elevation.adapter';

@Module({
  providers: [
    {
      provide: ELEVATION_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const provider = (
          config.get<string>('ELEVATION_PROVIDER') ?? 'kartverket'
        )
          .trim()
          .toLowerCase();
        if (provider !== 'kartverket') return new NullElevationAdapter();
        return new KartverketElevationAdapter({
          baseUrl: config.get<string>('ELEVATION_BASE_URL'),
        });
      },
    },
  ],
  exports: [ELEVATION_PORT],
})
export class ElevationModule {}
