import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthCoreModule } from '../auth/auth-core.module';
import { Assignment } from '../entities/assignment.entity';
import { FollowUp } from '../entities/followup.entity';
import { Incident } from '../entities/incident.entity';
import { Job } from '../entities/job.entity';
import { PointsLedger } from '../entities/points-ledger.entity';
import { Redemption } from '../entities/redemption.entity';
import { Reward } from '../entities/reward.entity';
import { TrainingRecord } from '../entities/training-record.entity';
import { VolunteerProfile } from '../entities/volunteer-profile.entity';
import { IncidentsModule } from '../incidents/incidents.module';
import { VolunteersModule } from '../volunteers/volunteers.module';
import { JobsController } from './jobs.controller';
import { SchedulingService } from './scheduling.service';

@Module({
  imports: [
    AuthCoreModule,
    IncidentsModule,
    VolunteersModule,
    TypeOrmModule.forFeature([
      Job,
      Assignment,
      VolunteerProfile,
      TrainingRecord,
      Incident,
      PointsLedger,
      Reward,
      Redemption,
      FollowUp,
    ]),
  ],
  controllers: [JobsController],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
