import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VolunteerProfile } from './volunteer-profile.entity';

export type IncidentType =
  | 'FEEL_UNWELL' // 身体不适
  | 'ABSENT' // 临时缺勤
  | 'RISK_UPGRADE' // 岗位风险升级
  | 'COMPLAINT' // 服务对象投诉
  | 'INSURANCE_EXPIRED' // 保险过期
  | 'FAMILY_OBJECTION' // 家属反对高强度服务
  | 'REWARD_OUT_OF_STOCK'; // 兑换库存不足

export type IncidentStatus = 'OPEN' | 'RESOLVED';
export type IncidentLevel = 'INFO' | 'WARN' | 'CRITICAL';

/**
 * 异常事件：统一挂在志愿档案下，可关联某次排班。
 * 处理动作（暂停档案、取消排班、保险提醒、通知家属等）记录为处置结果。
 */
@Entity('incidents')
export class Incident {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => VolunteerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'volunteer_id' })
  volunteer: VolunteerProfile;

  @Column({ name: 'volunteer_id' })
  volunteerId: number;

  @Column({ name: 'assignment_id', nullable: true })
  assignmentId: number;

  @Column({ length: 24 })
  type: IncidentType;

  @Column({ length: 10, default: 'WARN' })
  level: IncidentLevel;

  @Column({ length: 500 })
  description: string;

  @Column({ length: 10, default: 'OPEN' })
  status: IncidentStatus;

  @Column({ length: 500, name: 'resolution', nullable: true })
  resolution: string;

  @Column({ length: 50, name: 'handled_by', nullable: true })
  handledBy: string;

  @Column({ type: 'timestamptz', name: 'resolved_at', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
