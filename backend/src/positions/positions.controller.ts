import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  Assignment,
  AssignmentStatus,
  FamilyConsent,
  HealthStatus,
  Insurance,
  Position,
  PositionCategory,
  PositionStatus,
  RiskLevel,
  TrainingRecord,
  Volunteer,
  VolunteerStatus,
  CareFollowUp,
  FollowUpTrigger,
} from '../entities';
import { JwtAuthGuard, Roles } from '../auth/jwt.guard';
import { ArchiveService } from '../archive/archive.module';
import { insuranceValid, todayStr } from '../volunteers/volunteers.controller';

export class PositionDto {
  @IsNotEmpty({ message: '岗位名称不能为空' })
  title: string;

  @IsIn(Object.values(PositionCategory), { message: '岗位类别不合法' })
  category: PositionCategory;

  @IsNotEmpty({ message: '服务地点不能为空' })
  location: string;

  @IsOptional() @IsNumber()
  distanceKm?: number;

  @IsNotEmpty({ message: '服务日期不能为空' })
  serviceDate: string;

  @IsNotEmpty({ message: '开始时间不能为空' })
  startTime: string;

  @IsNotEmpty({ message: '结束时间不能为空' })
  endTime: string;

  @IsNumber()
  durationHours: number;

  @IsIn([RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH])
  riskLevel: RiskLevel;

  @IsNumber()
  headcount: number;

  @IsNumber()
  pointsPerHour: number;

  @IsOptional() @IsArray()
  requiredSkills?: string[];

  @IsOptional() @IsString()
  requiredTraining?: string;

  @IsOptional() @IsString()
  description?: string;
}

const RISK_LABEL = { low: '低风险', medium: '中风险', high: '高风险' };
const RISK_ORDER = { low: 0, medium: 1, high: 2 };

/** 计算岗位对应的时段（上午/下午/晚上） */
export function periodOf(startTime: string): string {
  const h = parseInt(startTime.split(':')[0], 10);
  if (h < 12) return 'am';
  if (h < 18) return 'pm';
  return 'eve';
}

export function weekdayOf(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 0 ? 7 : d.getDay();
}

export interface RecommendResult {
  volunteer: Volunteer & { age: number; insuranceValid: boolean };
  score: number;
  eligible: boolean;
  reasons: string[]; // 加分/减分理由
  blockers: string[]; // 硬性拦截原因
}

@Controller('positions')
@UseGuards(JwtAuthGuard)
export class PositionsController {
  constructor(
    @InjectRepository(Position) private positions: Repository<Position>,
    @InjectRepository(Volunteer) private volunteers: Repository<Volunteer>,
    @InjectRepository(Assignment) private assignments: Repository<Assignment>,
    @InjectRepository(TrainingRecord) private trainings: Repository<TrainingRecord>,
    @InjectRepository(Insurance) private insurances: Repository<Insurance>,
    @InjectRepository(CareFollowUp) private followUps: Repository<CareFollowUp>,
    private archive: ArchiveService,
  ) {}

  @Get()
  async list() {
    const all = await this.positions.find({ order: { serviceDate: 'DESC', id: 'DESC' } });
    const data = [];
    for (const p of all) {
      const assigned = await this.assignments.count({
        where: {
          positionId: p.id,
          status: In([AssignmentStatus.ASSIGNED, AssignmentStatus.CHECKED_IN, AssignmentStatus.COMPLETED]),
        },
      });
      data.push({ ...p, assignedCount: assigned });
    }
    return { code: 0, data };
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const p = await this.positions.findOne({ where: { id } });
    if (!p) return { code: 404, message: '岗位不存在' };
    const assignments = await this.assignments.find({
      where: { positionId: id },
      order: { id: 'ASC' },
    });
    const data = [];
    for (const a of assignments) {
      const v = await this.volunteers.findOne({ where: { id: a.volunteerId } });
      data.push({ ...a, volunteerName: v?.name, volunteerPhone: v?.phone });
    }
    return { code: 0, data: { ...p, assignments: data } };
  }

  @Post()
  @Roles('staff')
  async create(@Body() dto: PositionDto) {
    const p = await this.positions.save(this.positions.create(dto as Partial<Position>));
    return { code: 0, data: p, message: '岗位发布成功' };
  }

  @Put(':id')
  @Roles('staff')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: PositionDto) {
    const p = await this.positions.findOne({ where: { id } });
    if (!p) return { code: 404, message: '岗位不存在' };
    const oldRisk = p.riskLevel;
    Object.assign(p, dto);
    await this.positions.save(p);

    // 岗位风险升级：重新评估已排班志愿者的适配性
    const affected: string[] = [];
    if (RISK_ORDER[dto.riskLevel] > RISK_ORDER[oldRisk]) {
      const list = await this.assignments.find({
        where: { positionId: id, status: AssignmentStatus.ASSIGNED },
      });
      for (const a of list) {
        const check = await this.checkEligibility(a.volunteerId, p);
        if (!check.eligible) {
          a.status = AssignmentStatus.CANCELLED;
          a.cancelReason = `岗位风险升级为${RISK_LABEL[dto.riskLevel]}：${check.blockers.join('；')}`;
          await this.assignments.save(a);
          const v = await this.volunteers.findOne({ where: { id: a.volunteerId } });
          affected.push(v?.name || `#${a.volunteerId}`);
          await this.archive.record(
            a.volunteerId,
            'alert' as any,
            `岗位「${p.title}」风险升级，排班被取消`,
            `风险等级由${RISK_LABEL[oldRisk]}升级为${RISK_LABEL[dto.riskLevel]}，原因：${check.blockers.join('；')}`,
            a.id,
          );
          await this.followUps.save(
            this.followUps.create({
              volunteerId: a.volunteerId,
              assignmentId: a.id,
              trigger: FollowUpTrigger.RISK_ESCALATION,
              content: `岗位「${p.title}」风险升级为${RISK_LABEL[dto.riskLevel]}，该志愿者排班被取消，需回访说明并安抚`,
            }),
          );
        }
      }
    }
    return {
      code: 0,
      message: affected.length ? `保存成功；风险升级影响志愿者：${affected.join('、')}` : '保存成功',
      data: { affected },
    };
  }

  @Put(':id/status')
  @Roles('staff')
  async setStatus(@Param('id', ParseIntPipe) id: number, @Body() body: { status: PositionStatus }) {
    const p = await this.positions.findOne({ where: { id } });
    if (!p) return { code: 404, message: '岗位不存在' };
    p.status = body.status;
    await this.positions.save(p);
    return { code: 0, message: '状态已更新' };
  }

  /** 硬性适配检查（保险/家属/健康/培训/时间） */
  private async checkEligibility(volunteerId: number, p: Position) {
    const v = await this.volunteers.findOne({ where: { id: volunteerId } });
    const blockers: string[] = [];
    if (!v) return { eligible: false, blockers: ['志愿者不存在'] };
    if (v.status !== VolunteerStatus.ACTIVE) blockers.push('志愿者当前为暂停服务状态');
    const ins = await this.insurances.find({ where: { volunteerId } });
    if (p.riskLevel !== RiskLevel.LOW && !insuranceValid(ins)) {
      blockers.push('保险已过期或未登记，不能参与中高风险岗位');
    }
    if (p.riskLevel === RiskLevel.HIGH) {
      if (v.familyConsent === FamilyConsent.OPPOSED) blockers.push('家属反对参与高强度服务');
      if (v.familyNotifyRequired && v.familyConsent !== FamilyConsent.APPROVED)
        blockers.push('需要家属知情同意，当前未确认');
      if (v.healthStatus === HealthStatus.POOR) blockers.push('健康状况较弱，不适合高风险岗位');
    }
    if (p.requiredTraining) {
      const t = await this.trainings.find({ where: { volunteerId, title: p.requiredTraining } });
      const ok = t.some((x) => x.qualified && (!x.expiresAt || x.expiresAt >= todayStr()));
      if (!ok) blockers.push(`缺少合格培训「${p.requiredTraining}」`);
    }
    const wd = weekdayOf(p.serviceDate);
    const period = periodOf(p.startTime);
    const slot = (v.availableSlots || []).find((s) => s.weekday === wd);
    if (!slot || !slot.periods.includes(period)) {
      blockers.push('可服务时间不匹配');
    }
    if (p.distanceKm > v.maxDistanceKm * 1.5) {
      blockers.push(`距离 ${p.distanceKm}km 超出可接受范围`);
    }
    return { eligible: blockers.length === 0, blockers };
  }

  /** 智能推荐：能力、距离、健康风险、培训、历史评价综合打分 */
  @Get(':id/recommendations')
  @Roles('staff')
  async recommend(@Param('id', ParseIntPipe) id: number) {
    const p = await this.positions.findOne({ where: { id } });
    if (!p) return { code: 404, message: '岗位不存在' };
    const volunteers = await this.volunteers.find({ order: { id: 'ASC' } });
    const results: RecommendResult[] = [];
    for (const v of volunteers) {
      const ins = await this.insurances.find({ where: { volunteerId: v.id } });
      const check = await this.checkEligibility(v.id, p);
      const reasons: string[] = [];
      let score = 0;

      // 1. 技能匹配（30 分）
      const req = p.requiredSkills || [];
      if (req.length === 0) {
        score += 20;
        reasons.push('岗位无特殊技能要求 +20');
      } else {
        const hit = req.filter((s) => (v.skills || []).includes(s));
        const pts = Math.round((hit.length / req.length) * 30);
        score += pts;
        reasons.push(`技能匹配 ${hit.length}/${req.length}（${hit.join('、') || '无'}）+${pts}`);
      }

      // 2. 距离（20 分）
      const ratio = Math.min(p.distanceKm / Math.max(v.maxDistanceKm, 0.5), 1.5);
      const dPts = Math.max(0, Math.round(20 * (1 - ratio / 1.5)));
      score += dPts;
      reasons.push(`距离 ${p.distanceKm}km（可接受 ${v.maxDistanceKm}km）+${dPts}`);

      // 3. 健康风险适配（20 分）
      const healthBase = { good: 20, fair: 13, poor: 5 }[v.healthStatus];
      const riskFactor = { low: 1, medium: 0.9, high: 0.75 }[p.riskLevel];
      const hPts = Math.round(healthBase * riskFactor);
      score += hPts;
      reasons.push(`健康状况${{ good: '良好', fair: '一般', poor: '较弱' }[v.healthStatus]} × ${RISK_LABEL[p.riskLevel]} +${hPts}`);

      // 4. 培训合格（20 分）
      if (p.requiredTraining) {
        const t = await this.trainings.find({
          where: { volunteerId: v.id, title: p.requiredTraining },
        });
        const ok = t.some((x) => x.qualified && (!x.expiresAt || x.expiresAt >= todayStr()));
        if (ok) {
          score += 20;
          reasons.push(`培训「${p.requiredTraining}」合格 +20`);
        } else {
          reasons.push(`缺少合格培训「${p.requiredTraining}」+0`);
        }
      } else {
        const qualifiedCount = await this.trainings.count({
          where: { volunteerId: v.id, qualified: true },
        });
        const tPts = Math.min(20, qualifiedCount * 7);
        score += tPts;
        reasons.push(`已完成 ${qualifiedCount} 项合格培训 +${tPts}`);
      }

      // 5. 历史评价（10 分）
      const done = await this.assignments.find({
        where: { volunteerId: v.id, status: AssignmentStatus.COMPLETED },
      });
      const rated = done.filter((a) => a.rating);
      if (rated.length) {
        const avg = rated.reduce((s, a) => s + a.rating, 0) / rated.length;
        const rPts = Math.round((avg / 5) * 10);
        score += rPts;
        reasons.push(`历史评价 ${avg.toFixed(1)} 分 +${rPts}`);
      } else {
        score += 6;
        reasons.push('暂无历史评价，默认 +6');
      }

      const age = (await import('../volunteers/volunteers.controller')).ageOf(v.birthDate);
      results.push({
        volunteer: { ...v, age, insuranceValid: insuranceValid(ins) } as any,
        score,
        eligible: check.eligible,
        reasons,
        blockers: check.blockers,
      });
    }
    results.sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return b.score - a.score;
    });
    return { code: 0, data: results };
  }
}
