import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { healthBracket, insuranceValid } from '../common/safety';
import { Assignment } from '../entities/assignment.entity';
import { FollowUp } from '../entities/followup.entity';
import { Incident } from '../entities/incident.entity';
import { Job } from '../entities/job.entity';
import { Redemption } from '../entities/redemption.entity';
import { Reward } from '../entities/reward.entity';
import { VolunteerProfile } from '../entities/volunteer-profile.entity';

/**
 * 社区看板：不仅统计时长，还呈现岗位适合度、家属知情、保险有效、兑换兑现。
 */
@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(VolunteerProfile)
    private readonly profileRepo: Repository<VolunteerProfile>,
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(Incident)
    private readonly incidentRepo: Repository<Incident>,
    @InjectRepository(Reward) private readonly rewardRepo: Repository<Reward>,
    @InjectRepository(Redemption)
    private readonly redemptionRepo: Repository<Redemption>,
    @InjectRepository(FollowUp)
    private readonly followupRepo: Repository<FollowUp>,
  ) {}

  async dashboard() {
    const [volunteers, jobs, assignments, incidents, redemptions, followups] =
      await Promise.all([
        this.profileRepo.find(),
        this.jobRepo.find(),
        this.assignmentRepo.find({ relations: ['job'] }),
        this.incidentRepo.find(),
        this.redemptionRepo.find(),
        this.followupRepo.find(),
      ]);

    const active = volunteers.filter((v) => v.status === 'ACTIVE');
    const completed = assignments.filter((a) => a.status === 'COMPLETED');
    const absent = assignments.filter((a) => a.status === 'ABSENT');
    const cancelled = assignments.filter((a) => a.status === 'CANCELLED');
    const servedAssignments = completed.length + absent.length;
    const totalHours = volunteers.reduce((s, v) => s + Number(v.totalHours), 0);

    // ---- 队伍稳定性 ----
    const stability = {
      total: volunteers.length,
      active: active.length,
      paused: volunteers.length - active.length,
      pauseReasons: {
        feelUnwell: incidents.filter(
          (i) => i.type === 'FEEL_UNWELL' && i.status === 'OPEN',
        ).length,
        familyObjection: incidents.filter(
          (i) => i.type === 'FAMILY_OBJECTION' && i.status === 'OPEN',
        ).length,
      },
      attendanceRate:
        servedAssignments === 0
          ? 100
          : Number(
              ((completed.length / servedAssignments) * 100).toFixed(1),
            ),
      retentionRate:
        volunteers.length === 0
          ? 100
          : Number(((active.length / volunteers.length) * 100).toFixed(1)),
      avgRating:
        volunteers.filter((v) => v.ratingCount > 0).length === 0
          ? 5
          : Number(
              (
                volunteers.reduce((s, v) => s + v.ratingAvg, 0) /
                volunteers.length
              ).toFixed(2),
            ),
    };

    // ---- 服务覆盖（按岗位类别/风险等级） ----
    const byCategory: Record<string, { jobs: number; completed: number; hours: number }> = {};
    for (const j of jobs) {
      byCategory[j.category] ??= { jobs: 0, completed: 0, hours: 0 };
      byCategory[j.category].jobs += 1;
    }
    for (const a of completed) {
      const cat = a.job?.category ?? '其他';
      byCategory[cat] ??= { jobs: 0, completed: 0, hours: 0 };
      byCategory[cat].completed += 1;
      byCategory[cat].hours += a.actualHours;
    }
    const coverageByRisk = {
      LOW: { scheduled: 0, completed: 0 },
      MEDIUM: { scheduled: 0, completed: 0 },
      HIGH: { scheduled: 0, completed: 0 },
    };
    for (const a of assignments) {
      const r = a.job?.riskLevel ?? 'LOW';
      if (['SCHEDULED', 'CHECKED_IN', 'COMPLETED'].includes(a.status))
        coverageByRisk[r].scheduled += 1;
      if (a.status === 'COMPLETED') coverageByRisk[r].completed += 1;
    }

    // ---- 安全边界（不只看时长） ----
    const today = new Date().toISOString().slice(0, 10);
    const safety = {
      healthBrackets: {
        FIT: volunteers.filter((v) => healthBracket(v.health) === 'FIT').length,
        CHRONIC: volunteers.filter((v) => healthBracket(v.health) === 'CHRONIC').length,
        FRAGILE: volunteers.filter((v) => healthBracket(v.health) === 'FRAGILE').length,
      },
      insuranceValid: volunteers.filter((v) => insuranceValid(v, today)).length,
      insuranceInvalid: volunteers.filter((v) => !insuranceValid(v, today)).length,
      familyAware: volunteers.filter((v) => v.familyAware).length,
      familyConsentHigh: volunteers.filter((v) => v.familyConsentHigh).length,
      openIncidents: incidents.filter((i) => i.status === 'OPEN').length,
      incidentsByType: incidents.reduce<Record<string, number>>((acc, i) => {
        acc[i.type] = (acc[i.type] || 0) + 1;
        return acc;
      }, {}),
      highRiskWithoutConsent: active.filter(
        (v) => !v.familyConsentHigh && healthBracket(v.health) !== 'FIT',
      ).length,
      highRiskJobs: jobs.filter((j) => j.riskLevel === 'HIGH').length,
    };

    // ---- 积分与兑换兑现 ----
    const fulfilled = redemptions.filter((r) => r.status === 'FULFILLED');
    const pending = redemptions.filter((r) => r.status === 'PENDING');
    const failed = redemptions.filter(
      (r) => r.status === 'FAILED_OUT_OF_STOCK',
    );
    const rewards = {
      totalPointsIssued: completed.reduce((s, a) => s + a.pointsAwarded, 0),
      outstandingPoints: volunteers.reduce((s, v) => s + v.pointsBalance, 0),
      redemptions: {
        total: redemptions.length,
        fulfilled: fulfilled.length,
        pending: pending.length,
        failed: failed.length,
        fulfillmentRate:
          redemptions.length === 0
            ? 100
            : Number(
                ((fulfilled.length / redemptions.length) * 100).toFixed(1),
              ),
      },
      lowStockRewards: (await this.rewardRepo.find())
        .filter((r) => r.stock <= 3)
        .map((r) => ({ id: r.id, name: r.name, stock: r.stock })),
    };

    // ---- 关怀覆盖 ----
    const caredVolunteerIds = new Set(followups.map((f) => f.volunteerId));
    const followupStats = {
      total: followups.length,
      healthFollowups: followups.filter((f) => f.kind === 'HEALTH').length,
      complaintFollowups: followups.filter((f) => f.kind === 'COMPLAINT').length,
      coveredVolunteers: caredVolunteerIds.size,
      uncoveredVolunteers: volunteers.filter(
        (v) => !caredVolunteerIds.has(v.id) && v.totalHours > 0,
      ).length,
    };

    return {
      service: {
        totalJobs: jobs.length,
        openJobs: jobs.filter((j) => j.status === 'OPEN').length,
        completedAssignments: completed.length,
        absent: absent.length,
        cancelled: cancelled.length,
        totalHours: Number(totalHours.toFixed(1)),
      },
      stability,
      coverage: { byCategory, byRisk: coverageByRisk },
      safety,
      rewards,
      followups: followupStats,
    };
  }
}
