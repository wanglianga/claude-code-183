import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Assignment } from './assignment.entity';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export const JOB_CATEGORIES = [
  '图书整理',
  '文明劝导',
  '助餐引导',
  '儿童阅读陪伴',
  '邻里调解',
  '活动签到',
] as const;

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  title: string;

  @Column({ length: 30 })
  category: string;

  @Column({ length: 200 })
  location: string;

  /** 服务点相对社区各小区的参考距离（公里），用于距离推荐 */
  @Column('float', { name: 'distance_km', default: 1 })
  distanceKm: number;

  @Column('float', { name: 'duration_hours', default: 2 })
  durationHours: number;

  @Column({ length: 8, name: 'risk_level', default: 'LOW' })
  riskLevel: RiskLevel;

  @Column('int', { default: 1 })
  capacity: number;

  /** 完成服务可得基础积分 */
  @Column('int', { name: 'base_points', default: 10 })
  basePoints: number;

  @Column('text', { array: true, name: 'required_skills', default: () => "'{}'" })
  requiredSkills: string[];

  /** 是否要求培训合格 */
  @Column({ default: false, name: 'require_training' })
  requireTraining: boolean;

  /** 要求合格的专项培训课程（为空时只要求“岗前通用培训”） */
  @Column({ length: 100, name: 'required_course', nullable: true })
  requiredCourse: string;

  @Column({ type: 'date', name: 'service_date' })
  serviceDate: string;

  @Column({ type: 'time', name: 'start_time' })
  startTime: string;

  @Column({ type: 'time', name: 'end_time' })
  endTime: string;

  @Column({ length: 500, nullable: true })
  description: string;

  /** OPEN 报名中 / CLOSED 已关闭 */
  @Column({ length: 8, default: 'OPEN' })
  status: 'OPEN' | 'CLOSED';

  /** 岗位风险是否已临时升级（异常场景） */
  @Column({ default: false, name: 'risk_escalated' })
  riskEscalated: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Assignment, (a) => a.job)
  assignments: Assignment[];
}
