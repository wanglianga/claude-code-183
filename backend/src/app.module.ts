import { Module } from '@nestjs/common';
import { AuthCoreModule } from './auth/auth-core.module';
import { HealthController } from './health.controller';
import { IncidentsModule } from './incidents/incidents.module';
import { PointsModule } from './points/points.module';
import { RewardsModule } from './rewards/rewards.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { StatsModule } from './stats/stats.module';
import { VolunteersModule } from './volunteers/volunteers.module';

@Module({
  imports: [
    AuthCoreModule,
    PointsModule,
    VolunteersModule,
    IncidentsModule,
    SchedulingModule,
    RewardsModule,
    StatsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
