import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthRequest } from '../auth/jwt-auth.guard';
import { IsString, MinLength } from 'class-validator';

class StravaCallbackDto {
  @IsString()
  @MinLength(1)
  code!: string;

  @IsString()
  @MinLength(1)
  state!: string;
}

@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}

  @Get('status')
  status() {
    return this.connections.status();
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@Req() req: AuthRequest) {
    return this.connections.list(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('strava/start')
  startStrava(@Req() req: AuthRequest) {
    return this.connections.startStrava(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('strava/callback')
  finishStrava(@Req() req: AuthRequest, @Body() dto: StravaCallbackDto) {
    return this.connections.finishStrava(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('strava/sync')
  syncStrava(@Req() req: AuthRequest) {
    return this.connections.syncStrava(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':provider')
  disconnect(@Req() req: AuthRequest, @Param('provider') provider: string) {
    return this.connections.disconnect(req.user.userId, provider);
  }
}
