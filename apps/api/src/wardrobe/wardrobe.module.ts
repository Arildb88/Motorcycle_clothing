import { Module } from '@nestjs/common';
import { WardrobeService } from './wardrobe.service';
import { WardrobeController } from './wardrobe.controller';

@Module({
  providers: [WardrobeService],
  controllers: [WardrobeController],
  exports: [WardrobeService],
})
export class WardrobeModule {}
