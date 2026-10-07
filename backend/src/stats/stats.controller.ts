import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { StatsService } from './stats.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly svc: StatsService) {}

  /** 社区看板：队伍稳定性、服务覆盖、安全边界、兑换兑现、关怀覆盖 */
  @Roles('COMMUNITY', 'ADMIN')
  @Get('dashboard')
  dashboard() {
    return this.svc.dashboard();
  }
}
