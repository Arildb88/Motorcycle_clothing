import { Module } from '@nestjs/common';
import { GeonorgeTrailAdapter } from './geonorge-trail.adapter';
import { TRAIL_DIRECTORY } from './trail.types';
import { TrailsController } from './trails.controller';
import { TrailsService } from './trails.service';

@Module({
  controllers: [TrailsController],
  providers: [
    {
      provide: TRAIL_DIRECTORY,
      useValue: new GeonorgeTrailAdapter(),
    },
    TrailsService,
  ],
})
export class TrailsModule {}
