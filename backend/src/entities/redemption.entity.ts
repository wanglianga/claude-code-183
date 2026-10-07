import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Reward } from './reward.entity';
import { VolunteerProfile } from './volunteer-profile.entity';

export type RedemptionStatus =
  | 'PENDING' // 已申请，待兑现
  | 'FULFILLED' // 社区已发放/兑现
  | 'FAILED_OUT_OF_STOCK'; // 库存不足未兑现

/** 兑换单：积分兑换必须真实兑现，库存不足自动进入异常并回退积分 */
@Entity('redemptions')
export class Redemption {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => VolunteerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'volunteer_id' })
  volunteer: VolunteerProfile;

  @Column({ name: 'volunteer_id' })
  volunteerId: number;

  @ManyToOne(() => Reward)
  @JoinColumn({ name: 'reward_id' })
  reward: Reward;

  @Column({ name: 'reward_id' })
  rewardId: number;

  @Column({ length: 100, name: 'reward_name' })
  rewardName: string;

  @Column('int')
  points: number;

  @Column({ length: 20, default: 'PENDING' })
  status: RedemptionStatus;

  @Column({ length: 50, name: 'fulfilled_by', nullable: true })
  fulfilledBy: string;

  @Column({ type: 'timestamptz', name: 'fulfilled_at', nullable: true })
  fulfilledAt: Date;

  @Column({ length: 300, nullable: true })
  remark: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
