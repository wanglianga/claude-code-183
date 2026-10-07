import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ArchiveEvent,
  Insurance,
  PointsTransaction,
  TrainingRecord,
  User,
  Volunteer,
} from '../entities';
import { VolunteersController } from './volunteers.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Volunteer,
      TrainingRecord,
      Insurance,
      PointsTransaction,
      ArchiveEvent,
      User,
    ]),
  ],
  controllers: [VolunteersController],
})
export class VolunteersModule {}
