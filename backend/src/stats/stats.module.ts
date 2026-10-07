import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Assignment,
  CareFollowUp,
  Complaint,
  Insurance,
  Position,
  RedemptionOrder,
  Volunteer,
} from '../entities';
import { StatsController } from './stats.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Volunteer,
      Position,
      Assignment,
      Insurance,
      Complaint,
      CareFollowUp,
      RedemptionOrder,
    ]),
  ],
  controllers: [StatsController],
})
export class StatsModule {}
