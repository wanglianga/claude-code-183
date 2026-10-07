import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { VolunteersService } from '../volunteers/volunteers.service';
import { RefundDto, RestockDto, RewardDto } from './dto';
import { RewardsService } from './rewards.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class RewardsController {
  constructor(
    private readonly svc: RewardsService,
    private readonly volunteers: VolunteersService,
  ) {}

  @Get('rewards')
  rewards() {
    return this.svc.listRewards();
  }

  @Roles('COMMUNITY', 'ADMIN')
  @Post('rewards')
  create(@Body() dto: RewardDto) {
    return this.svc.createReward(dto);
  }

  @Roles('COMMUNITY', 'ADMIN')
  @Post('rewards/:id/restock')
  restock(@Param('id', ParseIntPipe) id: number, @Body() dto: RestockDto) {
    return this.svc.restock(id, dto);
  }

  /** 兑换记录（社区看全部，志愿者只看自己） */
  @Get('redemptions')
  async list(
    @Req() req: any,
    @Query('status') status?: string,
  ) {
    if (req.user.role === 'VOLUNTEER') {
      const p = await this.volunteers.findByUserId(req.user.userId);
      return this.svc.listRedemptions(p?.id, status);
    }
    return this.svc.listRedemptions(undefined, status);
  }

  /** 志愿者申请兑换 */
  @Post('rewards/:id/redeem')
  async redeem(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const p = await this.volunteers.findByUserId(req.user.userId);
    if (!p) throw new Error('志愿者档案不存在');
    return this.svc.redeem(p.id, id);
  }

  /** 社区兑现兑换券/荣誉 */
  @Roles('COMMUNITY', 'ADMIN')
  @Post('redemptions/:id/fulfill')
  fulfill(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.svc.fulfill(id, req.user.name);
  }

  /** 无法兑现时回退积分 */
  @Roles('COMMUNITY', 'ADMIN')
  @Post('redemptions/:id/refund')
  refund(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RefundDto,
  ) {
    return this.svc.refund(id, dto);
  }
}
