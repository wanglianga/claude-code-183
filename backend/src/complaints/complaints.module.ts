import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Assignment,
  CareFollowUp,
  Complaint,
  Position,
  Volunteer,
} from '../entities';
import { ComplaintsController } from './complaints.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Complaint, Volunteer, Assignment, Position, CareFollowUp]),
  ],
  controllers: [ComplaintsController],
})
export class ComplaintsModule {}
