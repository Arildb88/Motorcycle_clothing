import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthRequest } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@Req() req: AuthRequest) {
    return this.users.getMe(req.user.userId);
  }

  @Patch('me')
  update(@Req() req: AuthRequest, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(req.user.userId, dto);
  }

  @Post('me/onboarding')
  onboarding(@Req() req: AuthRequest, @Body() dto: CompleteOnboardingDto) {
    return this.users.completeOnboarding(req.user.userId, dto);
  }

  @Delete('me')
  remove(@Req() req: AuthRequest) {
    return this.users.deleteAccount(req.user.userId);
  }
}
