import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PointsTransaction,
  RedemptionItem,
  RedemptionOrder,
  Volunteer,
} from '../entities';
import { RedemptionsController } from './redemptions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([RedemptionItem, RedemptionOrder, Volunteer, PointsTransaction]),
  ],
  controllers: [RedemptionsController],
})
export class RedemptionsModule {}
