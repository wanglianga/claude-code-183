import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VolunteerProfile } from './volunteer-profile.entity';

/**
 * 关怀回访：服务或异常之后对银龄志愿者的回访记录，
 * 是连续志愿档案的最后一环。
 */
@Entity('followups')
export class FollowUp {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => VolunteerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'volunteer_id' })
  volunteer: VolunteerProfile;

  @Column({ name: 'volunteer_id' })
  volunteerId: number;

  @Column({ name: 'assignment_id', nullable: true })
  assignmentId: number;

  @Column({ name: 'incident_id', nullable: true })
  incidentId: number;

  /** HEALTH 健康关怀 / SERVICE 服务回访 / COMPLAINT 投诉回访 / ROUTINE 例行回访 */
  @Column({ length: 16 })
  kind: 'HEALTH' | 'SERVICE' | 'COMPLAINT' | 'ROUTINE';

  @Column({ length: 500, default: '' })
  content: string;

  @Column({ length: 8, name: 'health_status', default: 'GOOD' })
  healthStatus: 'GOOD' | 'FAIR' | 'POOR';

  @Column({ default: false, name: 'continue_willing' })
  continueWilling: boolean;

  @Column({ length: 50, name: 'visited_by', nullable: true })
  visitedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
