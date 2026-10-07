import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Assignment,
  CareFollowUp,
  Insurance,
  Position,
  TrainingRecord,
  Volunteer,
} from '../entities';
import { PositionsController } from './positions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Position,
      Volunteer,
      Assignment,
      TrainingRecord,
      Insurance,
      CareFollowUp,
    ]),
  ],
  controllers: [PositionsController],
})
export class PositionsModule {}
