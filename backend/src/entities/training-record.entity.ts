import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VolunteerProfile } from './volunteer-profile.entity';

@Entity('training_records')
export class TrainingRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => VolunteerProfile, (v) => v.trainings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'volunteer_id' })
  volunteer: VolunteerProfile;

  @Column({ name: 'volunteer_id' })
  volunteerId: number;

  /** 课程名，如 岗前通用培训/儿童陪伴专项/文明劝导专项 */
  @Column({ length: 100 })
  course: string;

  @Column({ default: false })
  passed: boolean;

  @Column({ length: 500, nullable: true })
  note: string;

  @CreateDateColumn({ name: 'trained_at' })
  trainedAt: Date;
}
