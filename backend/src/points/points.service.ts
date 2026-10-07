import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { PointsLedger, PointsReason } from '../entities/points-ledger.entity';
import { VolunteerProfile } from '../entities/volunteer-profile.entity';

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(PointsLedger)
    private readonly ledgerRepo: Repository<PointsLedger>,
    @InjectRepository(VolunteerProfile)
    private readonly profileRepo: Repository<VolunteerProfile>,
    private readonly ds: DataSource,
  ) {}

  /**
   * 记一笔积分流水并更新账户余额。
   * 传入 manager 时加入调用方事务，保证“完成服务/兑换”与积分同进同退。
   */
  async record(
    volunteerId: number,
    change: number,
    reason: PointsReason,
    detail: string,
    refId?: number,
    manager?: EntityManager,
  ): Promise<PointsLedger> {
    const run = async (m: EntityManager) => {
      const profile = await m.findOne(VolunteerProfile, {
        where: { id: volunteerId },
      });
      if (!profile) throw new Error('志愿者档案不存在');
      const next = profile.pointsBalance + change;
      if (next < 0) throw new Error('积分余额不足');
      profile.pointsBalance = next;
      await m.save(profile);
      return m.save(
        m.create(PointsLedger, {
          volunteerId,
          change,
          balanceAfter: next,
          reason,
          detail,
          refId: refId ?? null,
        }),
      );
    };
    return manager ? run(manager) : this.ds.transaction(run);
  }

  list(volunteerId: number) {
    return this.ledgerRepo.find({
      where: { volunteerId },
      order: { id: 'DESC' },
      take: 100,
    });
  }
}
