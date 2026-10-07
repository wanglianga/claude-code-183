import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  escalateRisk,
  familyGate,
  healthBracket,
  insuranceValid,
  maxAllowedRisk,
  riskRank,
} from '../common/safety';
import { Assignment } from '../entities/assignment.entity';
import { Incident } from '../entities/incident.entity';
import { Job } from '../entities/job.entity';
import { PointsService } from '../points/points.service';
import { TrainingRecord } from '../entities/training-record.entity';
import { VolunteerProfile } from '../entities/volunteer-profile.entity';
import { IncidentsService } from '../incidents/incidents.service';
import { CancelDto, CompleteDto, CreateJobDto, EscalateDto } from './dto';

interface CandidateView {
  volunteer: any;
  trainings: TrainingRecord[];
  completedCount: number;
  blockers: string[];
  warnings: string[];
  reasons: string[];
  total: number;
  eligible: boolean;
  alreadyAssigned?: boolean;
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

@Injectable()
export class SchedulingService {
  constructor(
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(VolunteerProfile)
    private readonly profileRepo: Repository<VolunteerProfile>,
    @InjectRepository(TrainingRecord)
    private readonly trainingRepo: Repository<TrainingRecord>,
    @InjectRepository(Incident)
    private readonly incidentRepo: Repository<Incident>,
    private readonly points: PointsService,
    private readonly incidents: IncidentsService,
    private readonly ds: DataSource,
  ) {}

  // ---------- 岗位 ----------

  createJob(dto: CreateJobDto) {
    return this.jobRepo.save(this.jobRepo.create(dto));
  }

  listJobs(includeClosed = false) {
    return this.jobRepo.find({
      where: includeClosed ? {} : { status: 'OPEN' },
      order: { serviceDate: 'ASC', startTime: 'ASC' },
    });
  }

  async getJob(id: number) {
    const job = await this.jobRepo.findOne({
      where: { id },
      relations: ['assignments'],
    });
    if (!job) throw new NotFoundException('岗位不存在');
    const filled = (job.assignments || []).filter((a) =>
      ['RECOMMENDED', 'SCHEDULED', 'CHECKED_IN'].includes(a.status),
    ).length;
    return { ...job, filled, remaining: Math.max(0, job.capacity - filled) };
  }

  async closeJob(id: number) {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException('岗位不存在');
    job.status = 'CLOSED';
    return this.jobRepo.save(job);
  }

  /**
   * 岗位风险升级：有效风险等级上调一级；
   * 已排班但不再满足安全门槛（健康/家属/保险）的志愿者自动撤出并登记异常。
   */
  async escalateRisk(id: number, dto: EscalateDto) {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException('岗位不存在');
    job.riskEscalated = true;
    if (job.riskLevel === 'LOW') job.riskLevel = 'MEDIUM';
    else job.riskLevel = 'HIGH';
    await this.jobRepo.save(job);

    const assignments = await this.assignmentRepo.find({
      where: { jobId: id, status: In(['RECOMMENDED', 'SCHEDULED']) },
    });
    const pulled: number[] = [];
    for (const a of assignments) {
      const view = await this.evaluateCandidate(a.volunteerId, job, []);
      if (!view.eligible) {
        a.status = 'CANCELLED';
        a.remark = `岗位风险升级，安全门槛不再满足：${view.blockers.join('；')}`;
        await this.assignmentRepo.save(a);
        pulled.push(a.volunteerId);
        await this.incidents.create(
          {
            volunteerId: a.volunteerId,
            type: 'RISK_UPGRADE',
            description: `岗位「${job.title}」风险升级，系统撤出排班：${view.blockers.join('；')}。${dto.description}`,
            assignmentId: a.id,
          },
          '系统',
        );
      }
    }
    return { job, pulledVolunteers: pulled };
  }

  // ---------- 推荐 ----------

  /**
   * 根据能力、距离、健康风险、培训合格、历史评价推荐排班。
   * 硬性安全门槛不满足 -> eligible=false 且不能排班；其余为可解释得分与提醒。
   */
  async recommend(jobId: number): Promise<{
    job: Job;
    filled: number;
    capacity: number;
    candidates: CandidateView[];
  }> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('岗位不存在');

    const volunteers = await this.profileRepo.find({ order: { id: 'ASC' } });
    const existing = await this.assignmentRepo.find({ where: { jobId } });
    const existingIds = new Set(existing.map((a) => a.volunteerId));

    const views: CandidateView[] = [];
    for (const v of volunteers) {
      const view = await this.evaluateCandidate(v.id, job, [
        ...existingIds,
      ]);
      views.push(view);
    }
    views.sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return b.total - a.total;
    });
    const filled = existing.filter((a) =>
      ['RECOMMENDED', 'SCHEDULED', 'CHECKED_IN'].includes(a.status),
    ).length;
    return {
      job,
      filled,
      capacity: job.capacity,
      candidates: views.map((v) => ({
        ...v,
        volunteer: this.lightProfile(v.volunteer),
        alreadyAssigned: existingIds.has(v.volunteer.id),
      })) as CandidateView[],
    };
  }

  private lightProfile(v: VolunteerProfile) {
    return {
      id: v.id,
      name: v.name,
      age: v.age,
      health: v.health,
      skills: v.skills,
      timePrefs: v.timePrefs,
      distanceKm: v.distanceKm,
      familyAware: v.familyAware,
      familyConsentHigh: v.familyConsentHigh,
      insuranceStatus: v.insuranceStatus,
      insuranceExpireDate: v.insuranceExpireDate,
      status: v.status,
      ratingAvg: v.ratingAvg,
      pointsBalance: v.pointsBalance,
    };
  }

  private async evaluateCandidate(
    volunteerId: number,
    job: Job,
    takenVolunteerIds: number[],
  ): Promise<CandidateView> {
    const v = await this.profileRepo.findOne({
      where: { id: volunteerId },
    });
    const trainings = await this.trainingRepo.find({ where: { volunteerId } });
    const completed = await this.assignmentRepo.count({
      where: { volunteerId, status: 'COMPLETED' },
    });

    const blockers: string[] = [];
    const warnings: string[] = [];
    const reasons: string[] = [];

    if (v.status !== 'ACTIVE') blockers.push('档案已暂停（身体或家属原因），暂不排班');
    if (takenVolunteerIds.includes(v.id)) blockers.push('已在该岗位名单中');

    const bracket = healthBracket(v.health);
    const effectiveRisk = escalateRisk(job.riskLevel, job.riskEscalated);
    const allowed = maxAllowedRisk(bracket);
    if (riskRank(effectiveRisk) > riskRank(allowed)) {
      blockers.push(
        `健康情况（${v.health}）不适合${effectiveRisk === 'HIGH' ? '高' : '中'}风险岗位`,
      );
    }

    if (!familyGate(bracket, effectiveRisk, v.familyAware, v.familyConsentHigh)) {
      if (effectiveRisk === 'HIGH')
        blockers.push('高风险岗位需家属明确同意参与高强度服务');
      else blockers.push('慢病志愿者承担中风险岗位需家属知情');
    }

    if (effectiveRisk === 'HIGH' && !insuranceValid(v)) {
      blockers.push('高风险岗位要求保险在有效期内');
    }

    const requiredCourse =
      job.requireTraining
        ? job.requiredCourse || '岗前通用培训'
        : null;
    let trainingPassed = true;
    if (requiredCourse) {
      trainingPassed = trainings.some(
        (t) => t.passed && t.course === requiredCourse,
      );
      if (!trainingPassed)
        blockers.push(`需先通过培训：${requiredCourse}`);
    }
    const generalPassed = trainings.some(
      (t) => t.passed && t.course === '岗前通用培训',
    );

    // 同日时间冲突（已排班/已签到，排除当前岗位自身）
    const conflict = await this.hasTimeConflict(v.id, job);
    if (conflict) blockers.push(`与已排班服务时间冲突：${conflict}`);

    // ---- 打分 ----
    let total = 0;
    const matched = (job.requiredSkills || []).filter((s) =>
      (v.skills || []).includes(s),
    );
    if (matched.length) {
      total += matched.length * 20;
      reasons.push(`技能匹配：${matched.join('、')} +${matched.length * 20}`);
    }
    const dist = Math.abs(v.distanceKm - job.distanceKm) + v.distanceKm * 0.5;
    const distScore = Math.max(0, 20 - Math.round(dist * 4));
    total += distScore;
    reasons.push(`距离适配 +${distScore}`);

    if (bracket === 'FIT') {
      total += 15;
      reasons.push('身体状况良好 +15');
    } else if (bracket === 'CHRONIC') {
      total += 8;
      reasons.push('慢病稳定，宜低中强度 +8');
      if (effectiveRisk === 'MEDIUM')
        warnings.push('慢病志愿者参与中风险岗位，请关注身体状况');
    } else {
      warnings.push('健康风险较高，仅建议低风险轻量岗位');
    }

    if (generalPassed) {
      total += 10;
      reasons.push('岗前培训合格 +10');
    }
    if (requiredCourse && trainingPassed) {
      total += 8;
      reasons.push(`专项培训合格 +8`);
    }

    total += Math.round(v.ratingAvg * 3);
    reasons.push(`历史评价 ${v.ratingAvg} 星 +${Math.round(v.ratingAvg * 3)}`);

    if (this.timePrefMatches(v.timePrefs, job.serviceDate)) {
      total += 10;
      reasons.push('可服务时间匹配 +10');
    }

    total += Math.min(completed * 2, 12);
    if (completed > 0)
      reasons.push(`已完成 ${completed} 次服务 +${Math.min(completed * 2, 12)}`);

    if (v.age >= 75) warnings.push('高龄志愿者（75岁以上），建议结伴服务');
    if (
      insuranceValid(v) &&
      v.insuranceExpireDate &&
      this.daysUntil(v.insuranceExpireDate) <= 15
    )
      warnings.push('保险将于 15 天内到期，请提醒续保');
    if (!insuranceValid(v) && effectiveRisk === 'LOW')
      warnings.push('保险未在有效期，建议尽快投保');
    if (completed === 0) warnings.push('新报名志愿者，建议先安排岗前体验');

    return {
      volunteer: v,
      trainings,
      completedCount: completed,
      blockers,
      warnings,
      reasons,
      total,
      eligible: blockers.length === 0,
    };
  }

  private timePrefMatches(prefs: string[], serviceDate: string): boolean {
    if (!prefs || prefs.length === 0) return false;
    const day = WEEKDAYS[new Date(serviceDate + 'T00:00:00Z').getUTCDay()];
    return prefs.some((p) => p.includes(day));
  }

  private daysUntil(date: string): number {
    const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').getTime();
    const target = new Date(date + 'T00:00:00Z').getTime();
    return Math.round((target - today) / 86400000);
  }

  private async hasTimeConflict(
    volunteerId: number,
    job: Job,
  ): Promise<string | null> {
    const assigned = await this.assignmentRepo.find({
      where: {
        volunteerId,
        status: In(['SCHEDULED', 'CHECKED_IN']),
      },
      relations: ['job'],
    });
    for (const a of assigned) {
      const j = a.job;
      if (j.id === job.id) continue;
      if (
        j.serviceDate === job.serviceDate &&
        job.startTime < j.endTime &&
        j.startTime < job.endTime
      ) {
        return `${j.title} ${j.startTime}-${j.endTime}`;
      }
    }
    return null;
  }

  // ---------- 排班 ----------

  async schedule(jobId: number, volunteerId: number, force = false) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('岗位不存在');
    if (job.status === 'CLOSED') throw new BadRequestException('岗位已关闭');

    const evaluation = await this.recommend(jobId);
    const cand = evaluation.candidates.find(
      (c) => c.volunteer.id === volunteerId,
    );
    if (!cand) throw new NotFoundException('志愿者不存在');
    if (!cand.eligible && !force) {
      throw new BadRequestException(
        `安全门槛不满足，不能排班：${cand.blockers.join('；')}`,
      );
    }
    const filled = evaluation.filled;
    if (filled >= job.capacity)
      throw new BadRequestException('岗位人数已满');

    const exist = await this.assignmentRepo.findOne({
      where: { jobId, volunteerId },
    });
    if (exist) {
      if (['CANCELLED', 'ABSENT', 'RECOMMENDED'].includes(exist.status)) {
        exist.status = 'SCHEDULED';
        exist.remark = force
          ? `社区强制排班（提醒：${cand.blockers.concat(cand.warnings).join('；')}）`
          : null;
        exist.recommendScore = {
          total: cand.total,
          reasons: cand.reasons,
          warnings: cand.warnings.concat(force ? cand.blockers : []),
        };
        return this.assignmentRepo.save(exist);
      }
      throw new BadRequestException('该志愿者已在岗位名单中');
    }
    return this.assignmentRepo.save(
      this.assignmentRepo.create({
        jobId,
        volunteerId,
        status: 'SCHEDULED',
        recommendScore: {
          total: cand.total,
          reasons: cand.reasons,
          warnings: cand.warnings.concat(force ? cand.blockers : []),
        },
        remark: force
          ? `社区强制排班（安全提醒：${cand.blockers.concat(cand.warnings).join('；')}）`
          : null,
      }),
    );
  }

  /** 志愿者本人报名：通过安全门槛后进入待确认名单（RECOMMENDED），由社区确认排班 */
  async apply(jobId: number, volunteerId: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('岗位不存在');
    if (job.status === 'CLOSED') throw new BadRequestException('岗位已关闭');

    const evaluation = await this.recommend(jobId);
    const cand = evaluation.candidates.find((c) => c.volunteer.id === volunteerId);
    if (!cand) throw new NotFoundException('志愿者档案不存在');
    if (!cand.eligible) {
      throw new BadRequestException(
        `暂不符合该岗位的安全条件：${cand.blockers.join('；')}`,
      );
    }
    const exist = await this.assignmentRepo.findOne({ where: { jobId, volunteerId } });
    if (exist && !['CANCELLED', 'ABSENT'].includes(exist.status)) {
      throw new BadRequestException('您已报名该岗位');
    }
    if (exist) {
      exist.status = 'RECOMMENDED';
      exist.remark = null;
      exist.recommendScore = {
        total: cand.total,
        reasons: cand.reasons,
        warnings: cand.warnings,
      };
      return this.assignmentRepo.save(exist);
    }
    return this.assignmentRepo.save(
      this.assignmentRepo.create({
        jobId,
        volunteerId,
        status: 'RECOMMENDED',
        recommendScore: {
          total: cand.total,
          reasons: cand.reasons,
          warnings: cand.warnings,
        },
      }),
    );
  }

  /** 自动排班：按推荐分从高到低补足缺口 */
  async autoSchedule(jobId: number) {
    const r = await this.recommend(jobId);
    const need = r.capacity - r.filled;
    if (need <= 0) throw new BadRequestException('岗位人数已满');
    const picks = r.candidates
      .filter((c) => c.eligible && !c.alreadyAssigned)
      .slice(0, need);
    const created = [];
    for (const c of picks) {
      created.push(
        await this.assignmentRepo.save(
          this.assignmentRepo.create({
            jobId,
            volunteerId: c.volunteer.id,
            status: 'SCHEDULED',
            recommendScore: {
              total: c.total,
              reasons: c.reasons,
              warnings: c.warnings,
            },
          }),
        ),
      );
    }
    return { scheduled: created.length, assignments: created };
  }

  listAssignments(jobId?: number, volunteerId?: number, status?: string) {
    return this.assignmentRepo.find({
      where: {
        ...(jobId ? { jobId } : {}),
        ...(volunteerId ? { volunteerId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      relations: ['job', 'volunteer'],
      order: { id: 'DESC' },
    });
  }

  getAssignment(id: number) {
    return this.assignmentRepo.findOne({
      where: { id },
      relations: ['job', 'volunteer'],
    });
  }

  async checkin(id: number) {
    const a = await this.assignmentRepo.findOne({
      where: { id },
      relations: ['job', 'volunteer'],
    });
    if (!a) throw new NotFoundException('排班记录不存在');
    if (!['SCHEDULED', 'RECOMMENDED'].includes(a.status))
      throw new BadRequestException('当前状态不能签到');
    if (!insuranceValid(a.volunteer)) {
      await this.incidents.create(
        {
          volunteerId: a.volunteerId,
          type: 'INSURANCE_EXPIRED',
          description: `签到「${a.job.title}」时发现保险不在有效期，已拦截签到`,
          assignmentId: a.id,
        },
        '系统',
      );
      throw new BadRequestException('保险已过期或未投保，不能签到，请社区核实');
    }
    a.status = 'CHECKED_IN';
    a.checkinAt = new Date();
    return this.assignmentRepo.save(a);
  }

  /** 完成服务：照片凭证或负责人确认；积分入账，更新时长与评价 */
  async complete(id: number, dto: CompleteDto, operator: string) {
    const a = await this.assignmentRepo.findOne({
      where: { id },
      relations: ['job', 'volunteer'],
    });
    if (!a) throw new NotFoundException('排班记录不存在');
    if (a.status !== 'CHECKED_IN')
      throw new BadRequestException('需先签到才能完成服务');

    const job = a.job;
    const bonus = dto.rating && dto.rating >= 5 ? Math.round(job.basePoints * 0.2) : 0;
    const points = job.basePoints + bonus;

    return this.ds.transaction(async (m) => {
      a.status = 'COMPLETED';
      a.completeMethod = dto.method;
      a.proofNote = dto.proofNote ?? null;
      a.completedAt = new Date();
      a.confirmedBy = operator;
      a.actualHours = job.durationHours;
      if (dto.rating) a.serviceRating = dto.rating;
      a.pointsAwarded = points;
      await m.save(a);

      const v = await m.findOne(VolunteerProfile, {
        where: { id: a.volunteerId },
      });
      v.totalHours += job.durationHours;
      if (dto.rating) {
        const cnt = v.ratingCount;
        v.ratingAvg = Number(
          ((v.ratingAvg * cnt + dto.rating) / (cnt + 1)).toFixed(2),
        );
        v.ratingCount = cnt + 1;
      }
      await m.save(v);

      await this.points.record(
        a.volunteerId,
        points,
        'SERVICE_EARN',
        `完成「${job.title}」服务${bonus ? '（好评奖励）' : ''}`,
        a.id,
        m,
      );
      return m.findOne(Assignment, { where: { id }, relations: ['job'] });
    });
  }

  async absent(id: number, reason: string) {
    const a = await this.assignmentRepo.findOne({
      where: { id },
      relations: ['job'],
    });
    if (!a) throw new NotFoundException('排班记录不存在');
    return this.incidents.absent(a.volunteerId, a.id, reason || '临时缺勤');
  }

  async cancel(id: number, dto: CancelDto) {
    const a = await this.assignmentRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('排班记录不存在');
    a.status = 'CANCELLED';
    a.remark = dto.reason;
    return this.assignmentRepo.save(a);
  }

  /** 服务对象投诉：登记异常并入档，可附评分 */
  async complaint(id: number, description: string, rating?: number) {
    const a = await this.assignmentRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('排班记录不存在');
    if (rating) {
      a.serviceRating = rating;
      const v = await this.profileRepo.findOne({
        where: { id: a.volunteerId },
      });
      const cnt = v.ratingCount;
      v.ratingAvg = Number(
        ((v.ratingAvg * cnt + rating) / (cnt + 1)).toFixed(2),
      );
      v.ratingCount = cnt + 1;
      await this.profileRepo.save(v);
      await this.assignmentRepo.save(a);
    }
    return this.incidents.create(
      {
        volunteerId: a.volunteerId,
        type: 'COMPLAINT',
        description,
        assignmentId: a.id,
      },
      '服务对象/社区',
    );
  }
}
