import { Module } from '@nestjs/common';
import { GeonorgeTrailAdapter } from './geonorge-trail.adapter';
import { CachingTrailDirectory } from './trail-cache';
import { TRAIL_DIRECTORY } from './trail.types';
import { TrailsController } from './trails.controller';
import { TrailsService } from './trails.service';

@Module({
  controllers: [TrailsController],
  providers: [
    {
      provide: TRAIL_DIRECTORY,
      useFactory: () => new CachingTrailDirectory(new GeonorgeTrailAdapter()),
    },
    TrailsService,
  ],
})
export class TrailsModule {}
