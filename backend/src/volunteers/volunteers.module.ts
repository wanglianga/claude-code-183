import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthCoreModule } from '../auth/auth-core.module';
import { Assignment } from '../entities/assignment.entity';
import { FollowUp } from '../entities/followup.entity';
import { Incident } from '../entities/incident.entity';
import { PointsLedger } from '../entities/points-ledger.entity';
import { Redemption } from '../entities/redemption.entity';
import { TrainingRecord } from '../entities/training-record.entity';
import { User } from '../entities/user.entity';
import { VolunteerProfile } from '../entities/volunteer-profile.entity';
import { VolunteersController } from './volunteers.controller';
import { VolunteersService } from './volunteers.service';

@Module({
  imports: [
    AuthCoreModule,
    TypeOrmModule.forFeature([
      User,
      VolunteerProfile,
      TrainingRecord,
      Assignment,
      Incident,
      PointsLedger,
      Redemption,
      FollowUp,
    ]),
  ],
  controllers: [VolunteersController],
  providers: [VolunteersService],
  exports: [VolunteersService, TypeOrmModule],
})
export class VolunteersModule {}
