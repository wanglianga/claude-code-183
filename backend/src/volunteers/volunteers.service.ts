import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from '../entities/assignment.entity';
import { FollowUp } from '../entities/followup.entity';
import { Incident } from '../entities/incident.entity';
import { PointsLedger } from '../entities/points-ledger.entity';
import { Redemption } from '../entities/redemption.entity';
import { TrainingRecord } from '../entities/training-record.entity';
import { User } from '../entities/user.entity';
import { VolunteerProfile } from '../entities/volunteer-profile.entity';
import { TrainingDto, UpdateProfileDto } from './dto';

const STAGE_LABEL: Record<string, string> = {
  register: '报名',
  training: '培训',
  schedule: '排班',
  checkin: '签到',
  service: '服务',
  points: '积分',
  redeem: '兑换',
  followup: '关怀回访',
  incident: '异常',
};

@Injectable()
export class VolunteersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(VolunteerProfile)
    private readonly profileRepo: Repository<VolunteerProfile>,
    @InjectRepository(TrainingRecord)
    private readonly trainingRepo: Repository<TrainingRecord>,
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(Incident)
    private readonly incidentRepo: Repository<Incident>,
    @InjectRepository(PointsLedger)
    private readonly ledgerRepo: Repository<PointsLedger>,
    @InjectRepository(Redemption)
    private readonly redemptionRepo: Repository<Redemption>,
    @InjectRepository(FollowUp)
    private readonly followupRepo: Repository<FollowUp>,
  ) {}

  findByUserId(userId: number) {
    return this.profileRepo.findOne({ where: { userId } });
  }

  async list() {
    const list = await this.profileRepo.find({ order: { id: 'ASC' } });
    return list.map((p) => this.summarize(p));
  }

  private summarize(p: VolunteerProfile) {
    return {
      id: p.id,
      name: p.name,
      age: p.age,
      gender: p.gender,
      phone: p.phone,
      address: p.address,
      distanceKm: p.distanceKm,
      health: p.health,
      skills: p.skills,
      timePrefs: p.timePrefs,
      familyAware: p.familyAware,
      familyConsentHigh: p.familyConsentHigh,
      insuranceStatus: p.insuranceStatus,
      insuranceExpireDate: p.insuranceExpireDate,
      status: p.status,
      pointsBalance: p.pointsBalance,
      totalHours: p.totalHours,
      ratingAvg: Number(p.ratingAvg?.toFixed(2)),
      ratingCount: p.ratingCount,
    };
  }

  async getDetail(id: number) {
    const p = await this.profileRepo.findOne({
      where: { id },
      relations: ['trainings'],
    });
    if (!p) throw new NotFoundException('志愿者档案不存在');
    return {
      ...this.summarize(p),
      userId: p.userId,
      healthNote: p.healthNote,
      emergencyContactName: p.emergencyContactName,
      emergencyContactPhone: p.emergencyContactPhone,
      createdAt: p.createdAt,
      trainings: (p.trainings || []).sort(
        (a, b) => +a.trainedAt - +b.trainedAt,
      ),
    };
  }

  async updateProfile(id: number, dto: UpdateProfileDto) {
    const p = await this.profileRepo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('志愿者档案不存在');
    Object.assign(p, dto);
    // 选择“有效”但没有日期时给一个默认期限；日期早于今天自动视为过期
    if (
      p.insuranceStatus === 'VALID' &&
      (!p.insuranceExpireDate || p.insuranceExpireDate < new Date().toISOString().slice(0, 10))
    ) {
      // 前端显式传日期时以日期为准；日期已过期则改状态
      if (p.insuranceExpireDate) p.insuranceStatus = 'EXPIRED';
    }
    await this.profileRepo.save(p);
    return this.getDetail(id);
  }

  addTraining(id: number, dto: TrainingDto) {
    return this.trainingRepo.save(
      this.trainingRepo.create({
        volunteerId: id,
        course: dto.course,
        passed: dto.passed,
        note: dto.note ?? null,
      }),
    );
  }

  listTrainings(id: number) {
    return this.trainingRepo.find({
      where: { volunteerId: id },
      order: { id: 'DESC' },
    });
  }

  listFollowUps(id: number) {
    return this.followupRepo.find({
      where: { volunteerId: id },
      order: { id: 'DESC' },
    });
  }

  async listPoints(id: number) {
    return this.ledgerRepo.find({
      where: { volunteerId: id },
      order: { id: 'DESC' },
      take: 100,
    });
  }

  /**
   * 统一志愿档案时间线：报名、培训、排班、签到、服务、积分、兑换、
   * 异常与关怀回访按时间汇聚成一条连续记录，便于排班与过程还原。
   */
  async timeline(id: number) {
    const p = await this.profileRepo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('志愿者档案不存在');

    const events: any[] = [];
    events.push({
      at: p.createdAt,
      stage: 'register',
      stageLabel: STAGE_LABEL.register,
      title: '报名登记',
      detail: `年龄 ${p.age} 岁 · 健康：${p.health} · 保险：${p.insuranceStatus}`,
    });

    const trainings = await this.trainingRepo.find({ where: { volunteerId: id } });
    trainings.forEach((t) =>
      events.push({
        at: t.trainedAt,
        stage: 'training',
        stageLabel: STAGE_LABEL.training,
        title: `${t.course} - ${t.passed ? '考核合格' : '未通过'}`,
        detail: t.note || '',
        refId: t.id,
      }),
    );

    const assignments = await this.assignmentRepo.find({
      where: { volunteerId: id },
      relations: ['job'],
    });
    assignments.forEach((a) => {
      events.push({
        at: a.createdAt,
        stage: 'schedule',
        stageLabel: STAGE_LABEL.schedule,
        title: `${a.job?.title ?? '岗位'}（${a.status}）`,
        detail: `推荐/排班状态：${a.status}`,
        refId: a.id,
      });
      if (a.checkinAt)
        events.push({
          at: a.checkinAt,
          stage: 'checkin',
          stageLabel: STAGE_LABEL.checkin,
          title: `签到 - ${a.job?.title ?? ''}`,
          refId: a.id,
        });
      if (a.completedAt)
        events.push({
          at: a.completedAt,
          stage: 'service',
          stageLabel: STAGE_LABEL.service,
          title: `完成服务 - ${a.job?.title ?? ''}`,
          detail: `时长 ${a.actualHours}h · 评价 ${a.serviceRating ?? '-'} 星 · ${
            a.completeMethod === 'PHOTO' ? '照片凭证' : '负责人确认'
          }`,
          refId: a.id,
        });
      if (a.pointsAwarded > 0)
        events.push({
          at: a.completedAt ?? a.createdAt,
          stage: 'points',
          stageLabel: STAGE_LABEL.points,
          title: `服务积分 +${a.pointsAwarded}`,
          detail: a.job?.title ?? '',
          refId: a.id,
        });
    });

    const redemptions = await this.redemptionRepo.find({
      where: { volunteerId: id },
    });
    redemptions.forEach((r) =>
      events.push({
        at: r.fulfilledAt ?? r.createdAt,
        stage: 'redeem',
        stageLabel: STAGE_LABEL.redeem,
        title: `兑换 ${r.rewardName}（${r.status === 'FULFILLED' ? '已兑现' : r.status === 'PENDING' ? '待兑现' : '未兑现/已回退'}）`,
        detail: `消耗 ${r.points} 积分`,
        refId: r.id,
      }),
    );

    const incidents = await this.incidentRepo.find({
      where: { volunteerId: id },
    });
    incidents.forEach((i) =>
      events.push({
        at: i.resolvedAt ?? i.createdAt,
        stage: 'incident',
        stageLabel: STAGE_LABEL.incident,
        title: `异常：${i.type}（${i.status === 'RESOLVED' ? '已处置' : '待处置'}）`,
        detail: i.description + (i.resolution ? `｜处置：${i.resolution}` : ''),
        refId: i.id,
      }),
    );

    const followups = await this.followupRepo.find({
      where: { volunteerId: id },
    });
    followups.forEach((f) =>
      events.push({
        at: f.createdAt,
        stage: 'followup',
        stageLabel: STAGE_LABEL.followup,
        title: `关怀回访（${f.kind}）`,
        detail: `${f.content}｜健康：${f.healthStatus}｜愿意继续：${f.continueWilling ? '是' : '否'}`,
        refId: f.id,
      }),
    );

    return events.sort((x, y) => +new Date(y.at) - +new Date(x.at));
  }
}
