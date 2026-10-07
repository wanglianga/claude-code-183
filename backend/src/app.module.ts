import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ArchiveEvent,
  Assignment,
  CareFollowUp,
  Complaint,
  Insurance,
  PointsTransaction,
  Position,
  RedemptionItem,
  RedemptionOrder,
  TrainingRecord,
  User,
  Volunteer,
} from './entities';
import { AuthModule } from './auth/auth.module';
import { ArchiveModule } from './archive/archive.module';
import { VolunteersModule } from './volunteers/volunteers.module';
import { PositionsModule } from './positions/positions.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { RedemptionsModule } from './redemptions/redemptions.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { FollowUpsModule } from './followups/followups.module';
import { StatsModule } from './stats/stats.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'silver_volunteer',
      entities: [
        User,
        Volunteer,
        TrainingRecord,
        Insurance,
        Position,
        Assignment,
        PointsTransaction,
        RedemptionItem,
        RedemptionOrder,
        Complaint,
        CareFollowUp,
        ArchiveEvent,
      ],
      synchronize: true,
    }),
    AuthModule,
    ArchiveModule,
    VolunteersModule,
    PositionsModule,
    AssignmentsModule,
    RedemptionsModule,
    ComplaintsModule,
    FollowUpsModule,
    StatsModule,
    SeedModule,
  ],
})
export class AppModule {}
