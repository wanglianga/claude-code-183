import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  Assignment,
  AssignmentStatus,
  CareFollowUp,
  FollowUpTrigger,
  PointsTransaction,
  PointsTxType,
  Position,
  PositionStatus,
  Volunteer,
} from '../entities';
import { JwtAuthGuard, Roles } from '../auth/jwt.guard';
import { ArchiveService } from '../archive/archive.module';

class AssignDto {
  @IsInt()
  volunteerId: number;
  @IsOptional() @IsString()
  note?: string;
  @IsOptional()
  score?: number;
}

class CheckInDto {
  @IsOptional() @IsString()
  photo?: string; // base64
}

class CompleteDto {
  @IsOptional() @IsString()
  photo?: string;
  @IsOptional() @IsString()
  confirmedBy?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5)
  rating?: number;
  @IsOptional() @IsString()
  reviewNote?: string;
}

class CancelDto {
  @IsNotEmpty({ message: '请填写取消原因' })
  reason: string;
}

const STATUS_LABEL = {
  assigned: '已排班',
  checked_in: '已签到',
  completed: '已完成',
  absent: '临时缺勤',
  cancelled: '已取消',
};

@Controller('assignments')
@UseGuards(JwtAuthGuard)
export class AssignmentsController {
  constructor(
    @InjectRepository(Assignment) private assignments: Repository<Assignment>,
    @InjectRepository(Position) private positions: Repository<Position>,
    @InjectRepository(Volunteer) private volunteers: Repository<Volunteer>,
    @InjectRepository(PointsTransaction) private txs: Repository<PointsTransaction>,
    @InjectRepository(CareFollowUp) private followUps: Repository<CareFollowUp>,
    private archive: ArchiveService,
  ) {}

  /** 我的排班（志愿者端） */
  @Get('mine')
  async mine(@Req() req) {
    if (req.user.role !== 'volunteer') return { code: 403, message: '仅志愿者可查看' };
    const list = await this.assignments.find({
      where: { volunteerId: req.user.volunteerId },
      order: { id: 'DESC' },
    });
    const data = [];
    for (const a of list) {
      const p = await this.positions.findOne({ where: { id: a.positionId } });
      data.push({ ...a, position: p });
    }
    return { code: 0, data };
  }

  /** 排班 */
  @Post()
  @Roles('staff')
  async assign(@Body() dto: AssignDto & { positionId: number }) {
    const p = await this.positions.findOne({ where: { id: dto.positionId } });
    if (!p) return { code: 404, message: '岗位不存在' };
    if (p.status === PositionStatus.CANCELLED || p.status === PositionStatus.DONE)
      return { code: 400, message: '岗位已关闭' };
    const v = await this.volunteers.findOne({ where: { id: dto.volunteerId } });
    if (!v) return { code: 404, message: '志愿者不存在' };
    const dup = await this.assignments.findOne({
      where: {
        positionId: p.id,
        volunteerId: v.id,
        status: In([AssignmentStatus.ASSIGNED, AssignmentStatus.CHECKED_IN, AssignmentStatus.COMPLETED]),
      },
    });
    if (dup) return { code: 400, message: '该志愿者已在此岗位排班' };
    const count = await this.assignments.count({
      where: {
        positionId: p.id,
        status: In([AssignmentStatus.ASSIGNED, AssignmentStatus.CHECKED_IN, AssignmentStatus.COMPLETED]),
      },
    });
    if (count >= p.headcount) return { code: 400, message: '岗位人数已满' };

    const a = await this.assignments.save(
      this.assignments.create({
        positionId: p.id,
        volunteerId: v.id,
        recommendScore: dto.score ?? null,
        assignNote: dto.note || '',
      }),
    );
    const newCount = count + 1;
    if (newCount >= p.headcount) {
      p.status = PositionStatus.FULL;
      await this.positions.save(p);
    }
    await this.archive.record(
      v.id,
      'assignment' as any,
      `排班至岗位「${p.title}」`,
      `服务时间 ${p.serviceDate} ${p.startTime}-${p.endTime}，地点：${p.location}` +
        (dto.score != null ? `，推荐得分 ${Math.round(dto.score)}` : '') +
        (dto.note ? `，备注：${dto.note}` : ''),
      a.id,
    );
    return { code: 0, data: a, message: '排班成功' };
  }

  /** 签到（志愿者本人或社区代签） */
  @Post(':id/checkin')
  async checkIn(@Param('id', ParseIntPipe) id: number, @Body() dto: CheckInDto, @Req() req) {
    const a = await this.assignments.findOne({ where: { id } });
    if (!a) return { code: 404, message: '排班不存在' };
    if (req.user.role === 'volunteer' && req.user.volunteerId !== a.volunteerId)
      return { code: 403, message: '无权操作' };
    if (a.status !== AssignmentStatus.ASSIGNED)
      return { code: 400, message: `当前状态（${STATUS_LABEL[a.status]}）不能签到` };
    a.status = AssignmentStatus.CHECKED_IN;
    a.checkInAt = new Date();
    if (dto.photo) a.checkInPhoto = dto.photo;
    await this.assignments.save(a);
    const p = await this.positions.findOne({ where: { id: a.positionId } });
    await this.archive.record(
      a.volunteerId,
      'checkin' as any,
      `岗位「${p?.title}」签到`,
      `签到时间 ${new Date().toLocaleString('zh-CN')}${dto.photo ? '，已上传签到照片' : ''}`,
      a.id,
    );
    return { code: 0, message: '签到成功' };
  }

  /** 完成服务：上传照片或负责人确认，积分入账 */
  @Post(':id/complete')
  async complete(@Param('id', ParseIntPipe) id: number, @Body() dto: CompleteDto, @Req() req) {
    const a = await this.assignments.findOne({ where: { id } });
    if (!a) return { code: 404, message: '排班不存在' };
    if (req.user.role === 'volunteer' && req.user.volunteerId !== a.volunteerId)
      return { code: 403, message: '无权操作' };
    if (![AssignmentStatus.ASSIGNED, AssignmentStatus.CHECKED_IN].includes(a.status))
      return { code: 400, message: `当前状态（${STATUS_LABEL[a.status]}）不能完成` };
    if (req.user.role === 'volunteer' && !dto.photo)
      return { code: 400, message: '志愿者自行完成需上传服务照片' };
    if (req.user.role === 'staff' && !dto.photo && !dto.confirmedBy)
      return { code: 400, message: '请上传服务照片或填写确认负责人' };

    const p = await this.positions.findOne({ where: { id: a.positionId } });
    const points = Math.round(p.durationHours * p.pointsPerHour);

    a.status = AssignmentStatus.COMPLETED;
    a.completedAt = new Date();
    if (dto.photo) a.servicePhoto = dto.photo;
    if (dto.confirmedBy) a.confirmedBy = dto.confirmedBy;
    if (dto.rating) a.rating = dto.rating;
    if (dto.reviewNote) a.reviewNote = dto.reviewNote;
    a.pointsAwarded = points;
    await this.assignments.save(a);

    // 积分入账
    const v = await this.volunteers.findOne({ where: { id: a.volunteerId } });
    v.pointsBalance += points;
    await this.volunteers.save(v);
    await this.txs.save(
      this.txs.create({
        volunteerId: v.id,
        type: PointsTxType.EARN,
        points,
        balanceAfter: v.pointsBalance,
        refType: 'assignment',
        refId: a.id,
        note: `完成岗位「${p.title}」服务 ${p.durationHours} 小时`,
      }),
    );

    // 岗位全部名额均完成则标记 done
    const completedCount = await this.assignments.count({
      where: { positionId: p.id, status: AssignmentStatus.COMPLETED },
    });
    if (completedCount >= p.headcount) {
      p.status = PositionStatus.DONE;
      await this.positions.save(p);
    }

    await this.archive.record(
      v.id,
      'service' as any,
      `完成岗位「${p.title}」服务`,
      `时长 ${p.durationHours} 小时${dto.confirmedBy ? `，负责人 ${dto.confirmedBy} 确认` : ''}` +
        `${dto.photo ? '，已上传服务照片' : ''}${dto.rating ? `，评价 ${dto.rating} 星` : ''}`,
      a.id,
    );
    await this.archive.record(
      v.id,
      'points' as any,
      `积分入账 +${points}`,
      `来源：岗位「${p.title}」服务，当前余额 ${v.pointsBalance}`,
      a.id,
    );
    return { code: 0, message: `服务完成，积分 +${points}`, data: { points } };
  }

  /** 临时缺勤 */
  @Post(':id/absent')
  @Roles('staff')
  async absent(@Param('id', ParseIntPipe) id: number, @Body() dto: CancelDto) {
    const a = await this.assignments.findOne({ where: { id } });
    if (!a) return { code: 404, message: '排班不存在' };
    if (![AssignmentStatus.ASSIGNED, AssignmentStatus.CHECKED_IN].includes(a.status))
      return { code: 400, message: '当前状态不能标记缺勤' };
    a.status = AssignmentStatus.ABSENT;
    a.cancelReason = dto.reason;
    await this.assignments.save(a);
    const p = await this.positions.findOne({ where: { id: a.positionId } });
    await this.archive.record(
      a.volunteerId,
      'absence' as any,
      `岗位「${p?.title}」临时缺勤`,
      `原因：${dto.reason}`,
      a.id,
    );
    await this.followUps.save(
      this.followUps.create({
        volunteerId: a.volunteerId,
        assignmentId: a.id,
        trigger: FollowUpTrigger.ABSENCE,
        content: `志愿者在岗位「${p?.title}」临时缺勤（${dto.reason}），需回访了解身体状况与后续安排`,
      }),
    );
    return { code: 0, message: '已标记缺勤并生成关怀回访任务' };
  }

  /** 取消排班（身体不适 / 家属反对等） */
  @Post(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: CancelDto, @Req() req) {
    const a = await this.assignments.findOne({ where: { id } });
    if (!a) return { code: 404, message: '排班不存在' };
    if (req.user.role === 'volunteer' && req.user.volunteerId !== a.volunteerId)
      return { code: 403, message: '无权操作' };
    if (![AssignmentStatus.ASSIGNED, AssignmentStatus.CHECKED_IN].includes(a.status))
      return { code: 400, message: '当前状态不能取消' };
    a.status = AssignmentStatus.CANCELLED;
    a.cancelReason = dto.reason;
    await this.assignments.save(a);
    const p = await this.positions.findOne({ where: { id: a.positionId } });
    const discomfort = dto.reason.includes('身体不适') || dto.reason.includes('身体') || dto.reason.includes('健康');
    await this.archive.record(
      a.volunteerId,
      'cancel' as any,
      `取消岗位「${p?.title}」排班`,
      `原因：${dto.reason}`,
      a.id,
    );
    if (discomfort) {
      await this.followUps.save(
        this.followUps.create({
          volunteerId: a.volunteerId,
          assignmentId: a.id,
          trigger: FollowUpTrigger.DISCOMFORT,
          content: `志愿者因「${dto.reason}」取消岗位「${p?.title}」排班，需关怀回访确认身体状况`,
        }),
      );
    }
    return { code: 0, message: discomfort ? '已取消并生成关怀回访任务' : '已取消排班' };
  }
}
