import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Job } from './job.entity';
import { VolunteerProfile } from './volunteer-profile.entity';

export type AssignmentStatus =
  | 'RECOMMENDED' // 系统推荐，待社区确认
  | 'SCHEDULED' // 已排班
  | 'CHECKED_IN' // 当天已签到
  | 'COMPLETED' // 服务完成
  | 'ABSENT' // 临时缺勤
  | 'CANCELLED'; // 取消（家属反对/风险升级等）

/**
 * 排班记录：同一条志愿档案中的“排班-签到-服务”环节。
 * 一次服务的所有事实（照片、确认人、评价、积分发放）都挂在这里。
 */
@Entity('assignments')
@Unique(['jobId', 'volunteerId'])
export class Assignment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Job, (j) => j.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @Column({ name: 'job_id' })
  jobId: number;

  @ManyToOne(() => VolunteerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'volunteer_id' })
  volunteer: VolunteerProfile;

  @Column({ name: 'volunteer_id' })
  volunteerId: number;

  @Column({ length: 12, default: 'RECOMMENDED' })
  status: AssignmentStatus;

  /** 推荐得分及可解释明细（JSON） */
  @Column('simple-json', { name: 'recommend_score', nullable: true })
  recommendScore: { total: number; reasons: string[]; warnings: string[] };

  @Column({ type: 'timestamptz', name: 'checkin_at', nullable: true })
  checkinAt: Date;

  /** 服务完成方式 PHOTO 上传照片 / LEADER 负责人确认 */
  @Column({ length: 8, name: 'complete_method', nullable: true })
  completeMethod: 'PHOTO' | 'LEADER';

  @Column({ type: 'text', name: 'proof_note', nullable: true })
  proofNote: string;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date;

  @Column({ length: 50, name: 'confirmed_by', nullable: true })
  confirmedBy: string;

  /** 服务评分 1-5 */
  @Column('float', { name: 'service_rating', nullable: true })
  serviceRating: number;

  /** 本次实际发放积分 */
  @Column('int', { name: 'points_awarded', default: 0 })
  pointsAwarded: number;

  /** 实际服务时长 */
  @Column('float', { name: 'actual_hours', default: 0 })
  actualHours: number;

  @Column({ length: 300, nullable: true })
  remark: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
