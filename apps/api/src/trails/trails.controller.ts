import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NearbyTrailsQueryDto } from './dto/trail-query.dto';
import { TrailsService } from './trails.service';

@Controller('trails')
@UseGuards(JwtAuthGuard)
export class TrailsController {
  constructor(private readonly trails: TrailsService) {}

  @Get('nearby')
  nearby(@Query() query: NearbyTrailsQueryDto) {
    return this.trails.nearby(query.lat, query.lon);
  }
}
