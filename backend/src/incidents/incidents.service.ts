import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointsService } from '../points/points.service';
import { Assignment } from '../entities/assignment.entity';
import { FollowUp } from '../entities/followup.entity';
import {
  Incident,
  IncidentLevel,
  IncidentType,
} from '../entities/incident.entity';
import { Redemption } from '../entities/redemption.entity';
import { VolunteerProfile } from '../entities/volunteer-profile.entity';
import {
  CreateIncidentDto,
  FeelUnwellDto,
  FollowUpDto,
  ResolveDto,
} from './dto';

const LEVEL_BY_TYPE: Record<IncidentType, IncidentLevel> = {
  FEEL_UNWELL: 'CRITICAL',
  ABSENT: 'WARN',
  RISK_UPGRADE: 'WARN',
  COMPLAINT: 'WARN',
  INSURANCE_EXPIRED: 'WARN',
  FAMILY_OBJECTION: 'CRITICAL',
  REWARD_OUT_OF_STOCK: 'WARN',
};

@Injectable()
export class IncidentsService {
  constructor(
    @InjectRepository(Incident)
    private readonly incidentRepo: Repository<Incident>,
    @InjectRepository(VolunteerProfile)
    private readonly profileRepo: Repository<VolunteerProfile>,
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(FollowUp)
    private readonly followupRepo: Repository<FollowUp>,
    @InjectRepository(Redemption)
    private readonly redemptionRepo: Repository<Redemption>,
    private readonly points: PointsService,
  ) {}

  async create(
    dto: CreateIncidentDto,
    operator: string,
  ): Promise<Incident> {
    const p = await this.profileRepo.findOne({
      where: { id: dto.volunteerId },
    });
    if (!p) throw new NotFoundException('志愿者档案不存在');
    const incident = await this.incidentRepo.save(
      this.incidentRepo.create({
        volunteerId: dto.volunteerId,
        assignmentId: dto.assignmentId ?? null,
        type: dto.type,
        level: dto.level ?? LEVEL_BY_TYPE[dto.type],
        description: dto.description,
      }),
    );
    return incident;
  }

  /** 服务当天身体不适：登记异常、暂停档案、如已排班则记缺勤并冻结完成 */
  async feelUnwell(
    volunteerId: number,
    assignmentId: number | null,
    dto: FeelUnwellDto,
  ) {
    const incident = await this.create(
      {
        volunteerId,
        type: 'FEEL_UNWELL',
        description: dto.description,
        assignmentId: assignmentId ?? undefined,
      },
      '志愿者本人',
    );
    const profile = await this.profileRepo.findOne({
      where: { id: volunteerId },
    });
    profile.status = 'PAUSED';
    await this.profileRepo.save(profile);

    if (assignmentId) {
      const a = await this.assignmentRepo.findOne({
        where: { id: assignmentId },
      });
      if (a && ['RECOMMENDED', 'SCHEDULED', 'CHECKED_IN'].includes(a.status)) {
        a.status = 'ABSENT';
        a.remark = `服务当天身体不适：${dto.description}`;
        await this.assignmentRepo.save(a);
      }
    }
    return incident;
  }

  /** 临时缺勤（未发生身体不适） */
  async absent(volunteerId: number, assignmentId: number, reason: string) {
    const a = await this.assignmentRepo.findOne({
      where: { id: assignmentId, volunteerId },
    });
    if (!a) throw new NotFoundException('排班记录不存在');
    if (!['RECOMMENDED', 'SCHEDULED'].includes(a.status)) {
      throw new BadRequestException('当前状态不能登记缺勤');
    }
    a.status = 'ABSENT';
    a.remark = reason;
    await this.assignmentRepo.save(a);
    return this.create(
      { volunteerId, type: 'ABSENT', description: reason, assignmentId },
      '系统',
    );
  }

  /** 家属反对参与高强度服务：登记 CRITICAL 异常、撤回高强度同意、取消高风险排班 */
  async familyObjection(
    volunteerId: number,
    assignmentId: number | null,
    dto: FeelUnwellDto,
  ) {
    const profile = await this.profileRepo.findOne({
      where: { id: volunteerId },
    });
    profile.familyConsentHigh = false;
    await this.profileRepo.save(profile);

    const incident = await this.create(
      {
        volunteerId,
        type: 'FAMILY_OBJECTION',
        description: dto.description,
        assignmentId: assignmentId ?? undefined,
      },
      '志愿者/家属',
    );

    if (assignmentId) {
      const a = await this.assignmentRepo.findOne({
        where: { id: assignmentId },
        relations: ['job'],
      });
      if (a && ['RECOMMENDED', 'SCHEDULED'].includes(a.status)) {
        a.status = 'CANCELLED';
        a.remark = `家属反对参与高强度服务：${dto.description}`;
        await this.assignmentRepo.save(a);
      }
    }
    return incident;
  }

  /** 保险过期：标记档案保险状态（看板/推荐将拦截高风险岗位） */
  async insuranceExpired(volunteerId: number, description: string) {
    const profile = await this.profileRepo.findOne({
      where: { id: volunteerId },
    });
    if (profile) {
      profile.insuranceStatus = 'EXPIRED';
      await this.profileRepo.save(profile);
    }
    return this.create(
      { volunteerId, type: 'INSURANCE_EXPIRED', description },
      '系统',
    );
  }

  async resolve(id: number, dto: ResolveDto, operator: string) {
    const inc = await this.incidentRepo.findOne({ where: { id } });
    if (!inc) throw new NotFoundException('异常不存在');
    inc.status = 'RESOLVED';
    inc.resolution = dto.resolution;
    inc.handledBy = operator;
    inc.resolvedAt = new Date();
    await this.incidentRepo.save(inc);

    if (dto.resumeVolunteer) {
      const p = await this.profileRepo.findOne({
        where: { id: inc.volunteerId },
      });
      if (p) {
        p.status = 'ACTIVE';
        await this.profileRepo.save(p);
      }
    }
    return inc;
  }

  /** 关怀回访 */
  async addFollowUp(volunteerId: number, dto: FollowUpDto, operator: string) {
    return this.followupRepo.save(
      this.followupRepo.create({
        volunteerId,
        assignmentId: dto.assignmentId ?? null,
        incidentId: dto.incidentId ?? null,
        kind: dto.kind,
        content: dto.content,
        healthStatus: dto.healthStatus ?? 'GOOD',
        continueWilling: dto.continueWilling ?? true,
        visitedBy: operator,
      }),
    );
  }

  list(volunteerId?: number) {
    return this.incidentRepo.find({
      where: volunteerId ? { volunteerId } : {},
      order: { id: 'DESC' },
      take: 200,
    });
  }

  listFollowUps(volunteerId?: number) {
    return this.followupRepo.find({
      where: volunteerId ? { volunteerId } : {},
      order: { id: 'DESC' },
      take: 200,
    });
  }
}
