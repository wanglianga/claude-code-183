import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VolunteerProfile } from './volunteer-profile.entity';

export type UserRole = 'VOLUNTEER' | 'COMMUNITY' | 'ADMIN';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 16 })
  role: UserRole;

  @Column({ length: 50 })
  name: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => VolunteerProfile, (p) => p.user)
  profile: VolunteerProfile;
}
