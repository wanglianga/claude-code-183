import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { TrainingDto, UpdateProfileDto } from './dto';
import { VolunteersService } from './volunteers.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('volunteers')
export class VolunteersController {
  constructor(private readonly svc: VolunteersService) {}

  /** 社区查看银龄志愿队伍名单 */
  @Roles('COMMUNITY', 'ADMIN')
  @Get()
  list() {
    return this.svc.list();
  }

  /** 志愿者查看自己的档案 */
  @Get('me/profile')
  async myProfile(@Req() req: any) {
    const p = await this.svc.findByUserId(req.user.userId);
    if (!p) return null;
    return this.svc.getDetail(p.id);
  }

  /** 志愿者更新报名档案（健康/技能/时间/家属知情/保险等） */
  @Put('me/profile')
  async updateMyProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    const p = await this.svc.findByUserId(req.user.userId);
    return this.svc.updateProfile(p.id, dto);
  }

  @Get('me/points')
  async myPoints(@Req() req: any) {
    const p = await this.svc.findByUserId(req.user.userId);
    return this.svc.listPoints(p.id);
  }

  @Get('me/timeline')
  async myTimeline(@Req() req: any) {
    const p = await this.svc.findByUserId(req.user.userId);
    return this.svc.timeline(p.id);
  }

  /** 社区查看任一志愿者连续志愿档案 */
  @Roles('COMMUNITY', 'ADMIN')
  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getDetail(id);
  }

  @Roles('COMMUNITY', 'ADMIN')
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProfileDto) {
    return this.svc.updateProfile(id, dto);
  }

  @Roles('COMMUNITY', 'ADMIN')
  @Get(':id/trainings')
  trainings(@Param('id', ParseIntPipe) id: number) {
    return this.svc.listTrainings(id);
  }

  @Roles('COMMUNITY', 'ADMIN')
  @Post(':id/trainings')
  addTraining(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TrainingDto,
  ) {
    return this.svc.addTraining(id, dto);
  }

  @Get(':id/followups')
  followups(@Param('id', ParseIntPipe) id: number) {
    return this.svc.listFollowUps(id);
  }

  @Get(':id/points')
  points(@Param('id', ParseIntPipe) id: number) {
    return this.svc.listPoints(id);
  }

  /** 全链路志愿档案时间线 */
  @Get(':id/timeline')
  timeline(@Param('id', ParseIntPipe) id: number) {
    return this.svc.timeline(id);
  }
}
