import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthRequest } from '../auth/jwt-auth.guard';
import { CommutePlanDto } from './dto/commute-plan.dto';
import { CommutePlanService } from './commute-plan.service';

@Controller('routes')
@UseGuards(JwtAuthGuard)
export class CommutePlanController {
  constructor(private readonly commute: CommutePlanService) {}

  /** Analyze outbound and return as one commute. Does not store forecasts on the route. */
  @Post(':id/commute-plan')
  plan(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: CommutePlanDto,
  ) {
    return this.commute.plan(req.user.userId, id, dto);
  }
}
