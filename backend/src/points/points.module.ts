import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointsLedger } from '../entities/points-ledger.entity';
import { VolunteerProfile } from '../entities/volunteer-profile.entity';
import { PointsService } from './points.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([PointsLedger, VolunteerProfile])],
  providers: [PointsService],
  exports: [PointsService],
})
export class PointsModule {}
