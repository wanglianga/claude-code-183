import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from '../entities/assignment.entity';
import { FollowUp } from '../entities/followup.entity';
import { Incident } from '../entities/incident.entity';
import { Job } from '../entities/job.entity';
import { PointsLedger } from '../entities/points-ledger.entity';
import { Redemption } from '../entities/redemption.entity';
import { Reward } from '../entities/reward.entity';
import { TrainingRecord } from '../entities/training-record.entity';
import { User } from '../entities/user.entity';
import { VolunteerProfile } from '../entities/volunteer-profile.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { JwtStrategy } from './jwt.strategy';

export const ENTITIES = [
  User,
  VolunteerProfile,
  TrainingRecord,
  Job,
  Assignment,
  Incident,
  PointsLedger,
  Reward,
  Redemption,
  FollowUp,
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('DB_HOST', 'localhost'),
        port: +cfg.get('DB_PORT', 5432),
        username: cfg.get('DB_USER', 'silver'),
        password: cfg.get('DB_PASSWORD', 'silver123'),
        database: cfg.get('DB_NAME', 'silvervolunteer'),
        entities: ENTITIES,
        synchronize: cfg.get('DB_SYNC', 'true') === 'true',
      }),
    }),
    TypeOrmModule.forFeature(ENTITIES),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get('JWT_SECRET', 'silver-volunteer-dev-secret'),
        signOptions: { expiresIn: '12h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [
    AuthService,
    JwtModule,
    JwtAuthGuard,
    RolesGuard,
    TypeOrmModule,
    PassportModule,
  ],
})
export class AuthCoreModule {}
