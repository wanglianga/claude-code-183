import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type RewardType = 'MEAL' | 'HAIRCUT' | 'HEALTHCHECK' | 'HONOR';

@Entity('rewards')
export class Reward {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 16 })
  type: RewardType;

  @Column('int')
  points: number;

  @Column('int', { default: 0 })
  stock: number;

  /** 累计已兑现数量 */
  @Column('int', { name: 'redeemed_count', default: 0 })
  redeemedCount: number;

  @Column({ length: 300, nullable: true })
  description: string;
}
