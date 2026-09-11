import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { RecommendService } from './recommend.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthRequest } from '../auth/jwt-auth.guard';

@Controller('recommend')
@UseGuards(JwtAuthGuard)
export class RecommendController {
  constructor(private readonly recommend: RecommendService) {}

  @Get()
  get(
    @Req() req: AuthRequest,
    @Query('routeId') routeId?: string,
    @Query('departureAt') departureAt?: string,
  ) {
    return this.recommend.forUser(req.user.userId, routeId, departureAt);
  }
}
