import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthRequest } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

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
}
