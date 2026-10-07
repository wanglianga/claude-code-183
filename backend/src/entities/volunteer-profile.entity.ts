import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { TrainingRecord } from './training-record.entity';

/**
 * 银龄志愿者志愿档案（报名信息）。
 * 报名 -> 培训 -> 排班 -> 签到 -> 服务 -> 积分 -> 兑换 -> 关怀回访
 * 全部通过 volunteerId 汇聚到同一条档案。
 */
@Entity('volunteer_profiles')
export class VolunteerProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (u) => u.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @Column()
  name: string;

  @Column({ type: 'int' })
  age: number;

  @Column({ length: 4, nullable: true })
  gender: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  /** 居住小区/地址 */
  @Column({ length: 200, nullable: true })
  address: string;

  /** 到社区服务点参考距离（公里） */
  @Column('float', { name: 'distance_km', default: 0 })
  distanceKm: number;

  /** 健康情况，如 健康/高血压/糖尿病/心脏病/腰腿疼 等 */
  @Column({ length: 200, default: '健康' })
  health: string;

  @Column({ length: 500, nullable: true })
  healthNote: string;

  /** 擅长技能：图书整理、沟通劝导、儿童陪伴、调解等 */
  @Column('text', { array: true, default: () => "'{}'" })
  skills: string[];

  /** 可服务时间偏好，如 ["周一上午","周三下午"] */
  @Column('text', { array: true, name: 'time_prefs', default: () => "'{}'" })
  timePrefs: string[];

  @Column({ length: 50, name: 'emergency_contact_name', nullable: true })
  emergencyContactName: string;

  @Column({ length: 20, name: 'emergency_contact_phone', nullable: true })
  emergencyContactPhone: string;

  /** 是否需要/已经家属知情 */
  @Column({ default: false, name: 'family_aware' })
  familyAware: boolean;

  /** 家属是否同意参与高强度（高风险）服务 */
  @Column({ default: false, name: 'family_consent_high' })
  familyConsentHigh: boolean;

  /** 保险状态 VALID 有效 / EXPIRED 已过期 / NONE 未投保 */
  @Column({ length: 16, name: 'insurance_status', default: 'NONE' })
  insuranceStatus: 'VALID' | 'EXPIRED' | 'NONE';

  @Column({ type: 'date', name: 'insurance_expire_date', nullable: true })
  insuranceExpireDate: string;

  /** 档案状态 ACTIVE 在队 / PAUSED 暂停（身体或家属原因） */
  @Column({ length: 16, default: 'ACTIVE' })
  status: 'ACTIVE' | 'PAUSED';

  @Column('int', { name: 'points_balance', default: 0 })
  pointsBalance: number;

  @Column('float', { name: 'total_hours', default: 0 })
  totalHours: number;

  @Column('float', { name: 'rating_avg', default: 5 })
  ratingAvg: number;

  @Column('int', { name: 'rating_count', default: 0 })
  ratingCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => TrainingRecord, (t) => t.volunteer)
  trainings: TrainingRecord[];
}
