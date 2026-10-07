import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VolunteerProfile } from './volunteer-profile.entity';

export type PointsReason =
  | 'SERVICE_EARN' // 服务获得
  | 'BONUS' // 好评/专项奖励
  | 'REDEEM' // 兑换扣减
  | 'ADJUST'; // 人工调整

/** 积分流水：账户每一笔进出都可追溯到服务或兑换 */
@Entity('points_ledger')
export class PointsLedger {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => VolunteerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'volunteer_id' })
  volunteer: VolunteerProfile;

  @Column({ name: 'volunteer_id' })
  volunteerId: number;

  @Column('int')
  change: number;

  @Column('int', { name: 'balance_after' })
  balanceAfter: number;

  @Column({ length: 16 })
  reason: PointsReason;

  @Column({ length: 200 })
  detail: string;

  /** 关联的排班或兑换单 */
  @Column({ name: 'ref_id', nullable: true })
  refId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
