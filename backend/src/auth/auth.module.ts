import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Volunteer } from '../entities';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt.guard';

export const JWT_SECRET = process.env.JWT_SECRET || 'silver-volunteer-secret-2026';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Volunteer]),
    JwtModule.register({ secret: JWT_SECRET, signOptions: { expiresIn: '12h' } }),
  ],
  controllers: [AuthController],
  providers: [JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard, TypeOrmModule],
})
export class AuthModule {}
