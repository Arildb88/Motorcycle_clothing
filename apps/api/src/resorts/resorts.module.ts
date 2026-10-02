import { Module } from '@nestjs/common';
import { FnuggResortAdapter } from './fnugg-resort.adapter';
import { RESORT_DIRECTORY } from './resort.types';
import { ResortsController } from './resorts.controller';
import { ResortsService } from './resorts.service';

@Module({
  controllers: [ResortsController],
  providers: [
    {
      provide: RESORT_DIRECTORY,
      useValue: new FnuggResortAdapter(),
    },
    ResortsService,
  ],
})
export class ResortsModule {}
