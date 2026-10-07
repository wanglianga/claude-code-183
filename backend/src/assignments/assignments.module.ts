import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Assignment,
  CareFollowUp,
  PointsTransaction,
  Position,
  Volunteer,
} from '../entities';
import { AssignmentsController } from './assignments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Assignment, Position, Volunteer, PointsTransaction, CareFollowUp]),
  ],
  controllers: [AssignmentsController],
})
export class AssignmentsModule {}
