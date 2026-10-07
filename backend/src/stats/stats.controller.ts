import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Assignment,
  AssignmentStatus,
  CareFollowUp,
  Complaint,
  ComplaintStatus,
  Insurance,
  Position,
  RedemptionOrder,
  RedemptionStatus,
  Volunteer,
  VolunteerStatus,
} from '../entities';
import { JwtAuthGuard, Roles } from '../auth/jwt.guard';
import { insuranceValid, todayStr } from '../volunteers/volunteers.controller';

@Controller('stats')
@UseGuards(JwtAuthGuard)
@Roles('staff')
export class StatsController {
  constructor(
    @InjectRepository(Volunteer) private volunteers: Repository<Volunteer>,
    @InjectRepository(Position) private positions: Repository<Position>,
    @InjectRepository(Assignment) private assignments: Repository<Assignment>,
    @InjectRepository(Insurance) private insurances: Repository<Insurance>,
    @InjectRepository(Complaint) private complaints: Repository<Complaint>,
    @InjectRepository(CareFollowUp) private followUps: Repository<CareFollowUp>,
    @InjectRepository(RedemptionOrder) private orders: Repository<RedemptionOrder>,
  ) {}

  @Get('dashboard')
  async dashboard() {
    const volunteers = await this.volunteers.find();
    const positions = await this.positions.find();
    const assignments = await this.assignments.find();
    const insurances = await this.insurances.find();

    /* ---------- 队伍稳定性 ---------- */
    const active = volunteers.filter((v) => v.status === VolunteerStatus.ACTIVE);
    const servedIds = new Set(
      assignments.filter((a) => a.status === AssignmentStatus.COMPLETED).map((a) => a.volunteerId),
    );
    const absentCount = assignments.filter((a) => a.status === AssignmentStatus.ABSENT).length;
    const finishedCount = assignments.filter((a) => a.status === AssignmentStatus.COMPLETED).length;
    const absenceRate =
      finishedCount + absentCount > 0
        ? Math.round((absentCount / (finishedCount + absentCount)) * 100)
        : 0;
    const rated = assignments.filter((a) => a.rating);
    const avgRating = rated.length
      ? Math.round((rated.reduce((s, a) => s + a.rating, 0) / rated.length) * 10) / 10
      : 0;

    /* ---------- 服务覆盖（按岗位类别） ---------- */
    const categories = ['图书整理', '文明劝导', '助餐引导', '儿童阅读陪伴', '邻里调解', '活动签到'];
    const coverage = categories.map((cat) => {
      const ps = positions.filter((p) => p.category === cat);
      const pIds = ps.map((p) => p.id);
      const as = assignments.filter(
        (a) => pIds.includes(a.positionId) && a.status === AssignmentStatus.COMPLETED,
      );
      const hours = as.reduce((s, a) => {
        const p = ps.find((x) => x.id === a.positionId);
        return s + (p ? p.durationHours : 0);
      }, 0);
      return {
        category: cat,
        positions: ps.length,
        completed: as.length,
        hours: Math.round(hours * 10) / 10,
      };
    });

    /* ---------- 安全与权益提醒 ---------- */
    const expiredInsurance: any[] = [];
    for (const v of volunteers) {
      const mine = insurances.filter((i) => i.volunteerId === v.id);
      if (!insuranceValid(mine)) {
        const latest = mine.sort((a, b) => (a.endDate < b.endDate ? 1 : -1))[0];
        expiredInsurance.push({
          volunteerId: v.id,
          name: v.name,
          endDate: latest ? latest.endDate : '未登记',
        });
      }
    }
    const openComplaints = await this.complaints.count({
      where: { status: In([ComplaintStatus.OPEN, ComplaintStatus.PROCESSING]) },
    });
    const pendingFollowUps = await this.followUps.count({ where: { done: false } });
    const failedRedemptions = await this.orders.count({
      where: { status: RedemptionStatus.FAILED },
    });
    const familyOpposed = volunteers.filter((v) => v.familyConsent === 'opposed').length;
    const today = todayStr();
    const upcoming = positions.filter(
      (p) => p.serviceDate >= today && (p.status === 'open' || p.status === 'full'),
    ).length;

    return {
      code: 0,
      data: {
        team: {
          total: volunteers.length,
          active: active.length,
          served: servedIds.size,
          absenceRate,
          avgRating,
          healthGood: volunteers.filter((v) => v.healthStatus === 'good').length,
          healthFair: volunteers.filter((v) => v.healthStatus === 'fair').length,
          healthPoor: volunteers.filter((v) => v.healthStatus === 'poor').length,
        },
        coverage,
        totals: {
          positions: positions.length,
          upcoming,
          assignments: assignments.length,
          completed: finishedCount,
          hours: Math.round(
            assignments
              .filter((a) => a.status === AssignmentStatus.COMPLETED)
              .reduce((s, a) => {
                const p = positions.find((x) => x.id === a.positionId);
                return s + (p ? p.durationHours : 0);
              }, 0) * 10,
          ) / 10,
          pointsAwarded: assignments.reduce((s, a) => s + (a.pointsAwarded || 0), 0),
        },
        alerts: {
          expiredInsurance,
          openComplaints,
          pendingFollowUps,
          failedRedemptions,
          familyOpposed,
        },
      },
    };
  }
}
