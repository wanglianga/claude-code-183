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
import {
  CancelDto,
  CompleteDto,
  CreateJobDto,
  EscalateDto,
  ScheduleDto,
} from './dto';
import { SchedulingService } from './scheduling.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class JobsController {
  constructor(
    private readonly svc: SchedulingService,
    private readonly volunteers: VolunteersService,
  ) {}

  // ---------- 岗位 ----------

  @Get('jobs')
  listJobs(@Query('all') all?: string) {
    return this.svc.listJobs(all === '1');
  }

  @Get('jobs/:id')
  job(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getJob(id);
  }

  @Roles('COMMUNITY', 'ADMIN')
  @Post('jobs')
  create(@Body() dto: CreateJobDto) {
    return this.svc.createJob(dto);
  }

  @Roles('COMMUNITY', 'ADMIN')
  @Post('jobs/:id/close')
  close(@Param('id', ParseIntPipe) id: number) {
    return this.svc.closeJob(id);
  }

  /** 岗位风险升级并撤出不再安全的排班 */
  @Roles('COMMUNITY', 'ADMIN')
  @Post('jobs/:id/escalate-risk')
  escalate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EscalateDto,
  ) {
    return this.svc.escalateRisk(id, dto);
  }

  // ---------- 推荐与排班 ----------

  /** 为岗位推荐志愿者（含安全门槛、可解释得分与提醒） */
  @Get('jobs/:id/recommend')
  recommend(@Param('id', ParseIntPipe) id: number) {
    return this.svc.recommend(id);
  }

  /** 志愿者本人报名（通过安全门槛后进入待确认名单） */
  @Post('jobs/:id/apply')
  async apply(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const p = await this.volunteers.findByUserId(req.user.userId);
    if (!p) throw new Error('志愿者档案不存在');
    return this.svc.apply(id, p.id);
  }

  @Roles('COMMUNITY', 'ADMIN')
  @Post('jobs/:id/schedule')
  schedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ScheduleDto & { force?: boolean },
  ) {
    return this.svc.schedule(id, dto.volunteerId, !!dto.force);
  }

  /** 一键自动排班：按推荐分补足人数 */
  @Roles('COMMUNITY', 'ADMIN')
  @Post('jobs/:id/auto-schedule')
  auto(@Param('id', ParseIntPipe) id: number) {
    return this.svc.autoSchedule(id);
  }

  // ---------- 排班记录 ----------

  @Get('assignments')
  async assignments(
    @Req() req: any,
    @Query('jobId') jobId?: string,
    @Query('status') status?: string,
  ) {
    let volunteerId: number | undefined;
    if (req.user.role === 'VOLUNTEER') {
      const p = await this.volunteers.findByUserId(req.user.userId);
      volunteerId = p?.id;
    }
    return this.svc.listAssignments(
      jobId ? +jobId : undefined,
      volunteerId,
      status,
    );
  }

  @Roles('COMMUNITY', 'ADMIN')
  @Get('assignments/all')
  allAssignments(
    @Query('volunteerId') volunteerId?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.listAssignments(
      undefined,
      volunteerId ? +volunteerId : undefined,
      status,
    );
  }

  /** 服务当天签到（志愿者本人签自己的排班，社区可代签） */
  @Post('assignments/:id/checkin')
  async checkin(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    if (req.user.role === 'VOLUNTEER') {
      const [p, a] = await Promise.all([
        this.volunteers.findByUserId(req.user.userId),
        this.svc.getAssignment(id),
      ]);
      if (!p || !a || a.volunteerId !== p.id) {
        throw new Error('不能为他人排班签到');
      }
    }
    return this.svc.checkin(id);
  }

  /** 完成服务（上传照片说明或负责人确认），积分即时入账 */
  @Roles('COMMUNITY', 'ADMIN')
  @Post('assignments/:id/complete')
  complete(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteDto,
    @Req() req: any,
  ) {
    return this.svc.complete(id, dto, req.user.name);
  }

  /** 临时缺勤登记（志愿者本人或社区） */
  @Post('assignments/:id/absent')
  async absent(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    if (req.user.role === 'VOLUNTEER') {
      const [p, a] = await Promise.all([
        this.volunteers.findByUserId(req.user.userId),
        this.svc.getAssignment(id),
      ]);
      if (!p || !a || a.volunteerId !== p.id) {
        throw new Error('只能登记本人的缺勤');
      }
    }
    return this.svc.absent(id, body.reason);
  }

  @Roles('COMMUNITY', 'ADMIN')
  @Post('assignments/:id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelDto,
  ) {
    return this.svc.cancel(id, dto);
  }

  /** 服务对象投诉登记 */
  @Roles('COMMUNITY', 'ADMIN')
  @Post('assignments/:id/complaint')
  complaint(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { description: string; rating?: number },
  ) {
    return this.svc.complaint(id, body.description, body.rating);
  }
}
