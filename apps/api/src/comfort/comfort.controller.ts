import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ComfortService } from './comfort.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthRequest } from '../auth/jwt-auth.guard';
import { UpdateComfortDto } from './dto/update-comfort.dto';

@Controller('comfort')
@UseGuards(JwtAuthGuard)
export class ComfortController {
  constructor(private readonly comfort: ComfortService) {}

  @Get()
  get(@Req() req: AuthRequest) {
    return this.comfort.get(req.user.userId);
  }

  @Patch()
  update(@Req() req: AuthRequest, @Body() dto: UpdateComfortDto) {
    return this.comfort.update(req.user.userId, dto);
  }
}
