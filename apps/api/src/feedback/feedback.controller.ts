import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthRequest } from '../auth/jwt-auth.guard';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get()
  list(@Req() req: AuthRequest) {
    return this.feedback.list(req.user.userId);
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateFeedbackDto) {
    return this.feedback.create(req.user.userId, dto);
  }
}
