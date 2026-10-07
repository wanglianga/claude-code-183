import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthCoreModule } from '../auth/auth-core.module';
import { Assignment } from '../entities/assignment.entity';
import { FollowUp } from '../entities/followup.entity';
import { Incident } from '../entities/incident.entity';
import { Redemption } from '../entities/redemption.entity';
import { VolunteerProfile } from '../entities/volunteer-profile.entity';
import { VolunteersModule } from '../volunteers/volunteers.module';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';

@Module({
  imports: [
    AuthCoreModule,
    VolunteersModule,
    TypeOrmModule.forFeature([
      Incident,
      VolunteerProfile,
      Assignment,
      FollowUp,
      Redemption,
    ]),
  ],
  controllers: [IncidentsController],
  providers: [IncidentsService],
  exports: [IncidentsService, TypeOrmModule],
})
export class IncidentsModule {}
