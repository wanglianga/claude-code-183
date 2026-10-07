import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthCoreModule } from '../auth/auth-core.module';
import { Incident } from '../entities/incident.entity';
import { Redemption } from '../entities/redemption.entity';
import { Reward } from '../entities/reward.entity';
import { VolunteerProfile } from '../entities/volunteer-profile.entity';
import { VolunteersModule } from '../volunteers/volunteers.module';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';

@Module({
  imports: [
    AuthCoreModule,
    VolunteersModule,
    TypeOrmModule.forFeature([
      Reward,
      Redemption,
      VolunteerProfile,
      Incident,
    ]),
  ],
  controllers: [RewardsController],
  providers: [RewardsService],
})
export class RewardsModule {}
