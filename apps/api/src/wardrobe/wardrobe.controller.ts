import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { WardrobeService } from './wardrobe.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthRequest } from '../auth/jwt-auth.guard';
import { demoLanguage } from '../domain';
import { CreateGarmentDto } from './dto/create-garment.dto';
import { UpdateGarmentDto } from './dto/update-garment.dto';
import { UpdateWardrobeSharingDto } from './dto/update-wardrobe-sharing.dto';
import {
  CatalogueContributionDto,
  CataloguePreviewDto,
} from './dto/catalogue.dto';
import { GarmentCatalogueService } from './garment-catalogue.service';

@Controller('wardrobe')
@UseGuards(JwtAuthGuard)
export class WardrobeController {
  constructor(
    private readonly wardrobe: WardrobeService,
    private readonly catalogue: GarmentCatalogueService,
  ) {}

  @Get('catalogue/choices')
  catalogueChoices(
    @Query('q') q?: string,
    @Query('brand') brand?: string,
    @Query('category') category?: string,
    @Query('activityScope') activityScope?: string,
  ) {
    return this.catalogue.choices({ q, brand, category, activityScope });
  }

  @Post('catalogue/preview')
  cataloguePreview(@Body() dto: CataloguePreviewDto) {
    return this.catalogue.preview(dto);
  }

  @Post('catalogue/contributions')
  catalogueContribution(
    @Req() req: AuthRequest,
    @Body() dto: CatalogueContributionDto,
  ) {
    return this.catalogue.contribute(req.user.userId, dto);
  }

  @Get('meta')
  meta() {
    return this.wardrobe.meta();
  }

  @Get('sharing')
  getSharing(@Req() req: AuthRequest) {
    return this.wardrobe.getSharing(req.user.userId);
  }

  @Patch('sharing')
  updateSharing(
    @Req() req: AuthRequest,
    @Body() dto: UpdateWardrobeSharingDto,
  ) {
    return this.wardrobe.updateSharing(req.user.userId, dto.sharedCategories);
  }

  @Get()
  list(@Req() req: AuthRequest, @Query('activity') activity?: string) {
    return this.wardrobe.list(req.user.userId, activity);
  }

  @Get(':id')
  get(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.wardrobe.get(req.user.userId, id);
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateGarmentDto) {
    return this.wardrobe.create(req.user.userId, dto);
  }

  @Patch(':id')
  update(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateGarmentDto,
  ) {
    return this.wardrobe.update(req.user.userId, id, dto);
  }

  @Delete('actions/demo')
  deleteDemo(@Req() req: AuthRequest, @Query('activity') activity?: string) {
    return this.wardrobe.deleteDemo(req.user.userId, activity ?? '');
  }

  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.wardrobe.remove(req.user.userId, id);
  }

  @Post('actions/seed-demo')
  seedDemo(
    @Req() req: AuthRequest,
    @Query('activity') activity?: string,
    @Query('force') force?: string,
    @Query('lang') lang?: string,
  ) {
    return this.wardrobe.seedDemo(
      req.user.userId,
      activity ?? '',
      force === 'true' || force === '1',
      demoLanguage(lang),
    );
  }
}
