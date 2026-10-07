import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthCoreModule } from '../auth/auth-core.module';
import { Assignment } from '../entities/assignment.entity';
import { FollowUp } from '../entities/followup.entity';
import { Incident } from '../entities/incident.entity';
import { Job } from '../entities/job.entity';
import { Redemption } from '../entities/redemption.entity';
import { Reward } from '../entities/reward.entity';
import { VolunteerProfile } from '../entities/volunteer-profile.entity';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [
    AuthCoreModule,
    TypeOrmModule.forFeature([
      VolunteerProfile,
      Job,
      Assignment,
      Incident,
      Reward,
      Redemption,
      FollowUp,
    ]),
  ],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
