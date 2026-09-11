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
import { CreateGarmentDto } from './dto/create-garment.dto';
import { UpdateGarmentDto } from './dto/update-garment.dto';

@Controller('wardrobe')
@UseGuards(JwtAuthGuard)
export class WardrobeController {
  constructor(private readonly wardrobe: WardrobeService) {}

  @Get('meta')
  meta() {
    return this.wardrobe.meta();
  }

  @Get()
  list(@Req() req: AuthRequest) {
    return this.wardrobe.list(req.user.userId);
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

  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.wardrobe.remove(req.user.userId, id);
  }

  @Post('actions/seed-demo')
  seedDemo(
    @Req() req: AuthRequest,
    @Query('force') force?: string,
  ) {
    return this.wardrobe.seedDemo(
      req.user.userId,
      force === 'true' || force === '1',
    );
  }
}
