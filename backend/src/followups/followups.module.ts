import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CareFollowUp, Volunteer } from '../entities';
import { FollowUpsController } from './followups.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CareFollowUp, Volunteer])],
  controllers: [FollowUpsController],
})
export class FollowUpsModule {}
