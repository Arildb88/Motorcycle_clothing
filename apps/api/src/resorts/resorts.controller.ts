import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  NearbyResortsQueryDto,
  SearchResortsQueryDto,
} from './dto/resort-query.dto';
import { ResortsService } from './resorts.service';

@Controller('resorts')
@UseGuards(JwtAuthGuard)
export class ResortsController {
  constructor(private readonly resorts: ResortsService) {}

  @Get('search')
  search(@Query() query: SearchResortsQueryDto) {
    return this.resorts.search(query.q);
  }

  @Get('nearby')
  nearby(@Query() query: NearbyResortsQueryDto) {
    return this.resorts.nearby(query.lat, query.lon);
  }
}
