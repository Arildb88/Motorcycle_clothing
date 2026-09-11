import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { OAuthDto } from './dto/oauth.dto';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthRequest } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('providers')
  providers() {
    return this.auth.providersStatus();
  }

  @Post('oauth/:provider/start')
  startLogin(@Param('provider') provider: 'facebook' | 'microsoft') {
    return this.auth.startOAuth(provider, 'login');
  }

  @Post('oauth/:provider/callback')
  finishLogin(
    @Param('provider') _provider: string,
    @Body() dto: OAuthCallbackDto,
  ) {
    return this.auth.finishOAuth(dto, 'login');
  }

  @UseGuards(JwtAuthGuard)
  @Post('identities/:provider/start')
  startLink(
    @Req() req: AuthRequest,
    @Param('provider') provider: 'facebook' | 'microsoft',
  ) {
    return this.auth.startOAuth(provider, 'link', req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('identities/:provider/callback')
  finishLink(
    @Req() req: AuthRequest,
    @Param('provider') _provider: string,
    @Body() dto: OAuthCallbackDto,
  ) {
    return this.auth.finishOAuth(dto, 'link', req.user.userId);
  }

  /** Legacy demo/token path for local/CI when IdPs are unset. */
  @Post('oauth')
  oauthLegacy(@Body() dto: OAuthDto) {
    return this.auth.oauthLegacy(dto);
  }
}
