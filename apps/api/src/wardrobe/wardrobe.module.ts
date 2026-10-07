import { Module } from '@nestjs/common';
import { WardrobeService } from './wardrobe.service';
import { WardrobeController } from './wardrobe.controller';
import { GarmentCatalogueService } from './garment-catalogue.service';

@Module({
  providers: [WardrobeService, GarmentCatalogueService],
  controllers: [WardrobeController],
  exports: [WardrobeService],
})
export class WardrobeModule {}
