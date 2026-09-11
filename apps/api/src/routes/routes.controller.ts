import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RoutesService } from './routes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthRequest } from '../auth/jwt-auth.guard';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { PlanFromRouteDto } from './dto/plan-from-route.dto';

@Controller('routes')
@UseGuards(JwtAuthGuard)
export class RoutesController {
  constructor(private readonly routes: RoutesService) {}

  @Get()
  list(
    @Req() req: AuthRequest,
    @Query('activityType') activityType?: string,
  ) {
    return this.routes.list(req.user.userId, activityType);
  }

  @Get('default')
  defaultRoute(@Req() req: AuthRequest) {
    return this.routes.getDefault(req.user.userId);
  }

  @Get(':id')
  get(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.routes.get(req.user.userId, id);
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateRouteDto) {
    return this.routes.create(req.user.userId, dto);
  }

  @Patch(':id')
  update(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateRouteDto,
  ) {
    return this.routes.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.routes.remove(req.user.userId, id);
  }

  /** Launch: create ActivityPlan from saved route + departure time. */
  @Post(':id/plan')
  plan(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: PlanFromRouteDto,
  ) {
    return this.routes.planFromRoute(req.user.userId, id, dto);
  }
}
