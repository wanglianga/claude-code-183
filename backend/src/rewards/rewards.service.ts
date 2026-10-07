import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Incident } from '../entities/incident.entity';
import { Redemption } from '../entities/redemption.entity';
import { Reward } from '../entities/reward.entity';
import { VolunteerProfile } from '../entities/volunteer-profile.entity';
import { PointsService } from '../points/points.service';
import { RefundDto, RewardDto, RestockDto } from './dto';

@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(Reward) private readonly rewardRepo: Repository<Reward>,
    @InjectRepository(Redemption)
    private readonly redemptionRepo: Repository<Redemption>,
    @InjectRepository(VolunteerProfile)
    private readonly profileRepo: Repository<VolunteerProfile>,
    @InjectRepository(Incident)
    private readonly incidentRepo: Repository<Incident>,
    private readonly points: PointsService,
    private readonly ds: DataSource,
  ) {}

  listRewards() {
    return this.rewardRepo.find({ order: { points: 'ASC' } });
  }

  createReward(dto: RewardDto) {
    return this.rewardRepo.save(this.rewardRepo.create(dto));
  }

  restock(id: number, dto: RestockDto) {
    return this.ds.transaction(async (m) => {
      const r = await m.findOne(Reward, { where: { id } });
      if (!r) throw new NotFoundException('奖励不存在');
      r.stock += dto.amount;
      await m.save(r);
      // 补货后通知：历史因库存不足失败的兑换仍保留记录，可重新申请
      return r;
    });
  }

  listRedemptions(volunteerId?: number, status?: string) {
    return this.redemptionRepo.find({
      where: {
        ...(volunteerId ? { volunteerId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      order: { id: 'DESC' },
    });
  }

  /**
   * 兑换：事务内校验库存、扣减积分、扣减库存。
   * 库存不足时不扣积分，登记 REWARD_OUT_OF_STOCK 异常并入志愿档案。
   */
  async redeem(volunteerId: number, rewardId: number) {
    const reward = await this.rewardRepo.findOne({ where: { id: rewardId } });
    if (!reward) throw new NotFoundException('奖励不存在');
    if (reward.stock <= 0) {
      await this.incidentRepo.save(
        this.incidentRepo.create({
          volunteerId,
          type: 'REWARD_OUT_OF_STOCK',
          level: 'WARN',
          description: `申请兑换「${reward.name}」时库存不足，积分未扣减，请补货后再兑`,
        }),
      );
      throw new BadRequestException('该奖励库存不足，已通知社区补货，积分未扣减');
    }
    const profile = await this.profileRepo.findOne({
      where: { id: volunteerId },
    });
    if (profile.pointsBalance < reward.points)
      throw new BadRequestException('积分余额不足');

    return this.ds.transaction(async (m) => {
      const locked = await m.findOne(Reward, {
        where: { id: rewardId },
      });
      if (locked.stock <= 0) {
        await m.save(
          m.create(Incident, {
            volunteerId,
            type: 'REWARD_OUT_OF_STOCK',
            description: `兑换「${reward.name}」并发时库存不足，积分未扣减`,
          }),
        );
        throw new BadRequestException('该奖励库存不足，积分未扣减');
      }
      locked.stock -= 1;
      await m.save(locked);

      const redemption = await m.save(
        m.create(Redemption, {
          volunteerId,
          rewardId,
          rewardName: reward.name,
          points: reward.points,
          status: 'PENDING',
        }),
      );
      await this.points.record(
        volunteerId,
        -reward.points,
        'REDEEM',
        `兑换「${reward.name}」（待兑现）`,
        redemption.id,
        m,
      );
      return redemption;
    });
  }

  /** 社区兑现：食堂/理发券发放、体检优惠核销、荣誉颁发 */
  async fulfill(id: number, operator: string) {
    const r = await this.redemptionRepo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('兑换单不存在');
    if (r.status !== 'PENDING')
      throw new BadRequestException('该兑换单不是待兑现状态');
    r.status = 'FULFILLED';
    r.fulfilledBy = operator;
    r.fulfilledAt = new Date();
    await this.redemptionRepo.save(r);

    const reward = await this.rewardRepo.findOne({
      where: { id: r.rewardId },
    });
    if (reward) {
      reward.redeemedCount += 1;
      await this.rewardRepo.save(reward);
    }
    return r;
  }

  /** 无法兑现（如商户券临时停发）：回退积分、返还库存并登记 */
  async refund(id: number, dto: RefundDto) {
    return this.ds.transaction(async (m) => {
      const r = await m.findOne(Redemption, { where: { id } });
      if (!r) throw new NotFoundException('兑换单不存在');
      if (r.status !== 'PENDING')
        throw new BadRequestException('仅待兑现兑换单可回退');

      r.status = 'FAILED_OUT_OF_STOCK';
      r.remark = `未兑现，积分已回退：${dto.reason}`;
      await m.save(r);

      const reward = await m.findOne(Reward, {
        where: { id: r.rewardId },
      });
      if (reward) {
        reward.stock += 1;
        await m.save(reward);
      }
      await this.points.record(
        r.volunteerId,
        r.points,
        'ADJUST',
        `「${r.rewardName}」未兑现，积分回退`,
        r.id,
        m,
      );
      await m.save(
        m.create(Incident, {
          volunteerId: r.volunteerId,
          type: 'REWARD_OUT_OF_STOCK',
          description: `兑换「${r.rewardName}」无法兑现：${dto.reason}，积分已回退`,
        }),
      );
      return r;
    });
  }
}
