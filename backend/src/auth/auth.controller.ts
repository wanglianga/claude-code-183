import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';
import { User, UserRole, Volunteer } from '../entities';
import { JwtAuthGuard } from './jwt.guard';

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, hash] = (stored || '').split(':');
  if (!salt || !hash) return false;
  const test = scryptSync(plain, salt, 32);
  const real = Buffer.from(hash, 'hex');
  return test.length === real.length && timingSafeEqual(test, real);
}

class LoginDto {
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Volunteer) private volunteers: Repository<Volunteer>,
    private jwt: JwtService,
  ) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.users.findOne({ where: { username: dto.username } });
    if (!user || !verifyPassword(dto.password, user.passwordHash)) {
      return { code: 401, message: '用户名或密码错误' };
    }
    let volunteer: Volunteer = null;
    if (user.role === UserRole.VOLUNTEER && user.volunteerId) {
      volunteer = await this.volunteers.findOne({ where: { id: user.volunteerId } });
    }
    const payload = { sub: user.id, username: user.username, role: user.role, volunteerId: user.volunteerId };
    return {
      code: 0,
      data: {
        token: this.jwt.sign(payload),
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          volunteerId: user.volunteerId,
          name: volunteer ? volunteer.name : user.username,
        },
      },
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req) {
    const user = await this.users.findOne({ where: { id: req.user.sub } });
    if (!user) return { code: 404, message: '用户不存在' };
    let volunteer: Volunteer = null;
    if (user.volunteerId) {
      volunteer = await this.volunteers.findOne({ where: { id: user.volunteerId } });
    }
    return {
      code: 0,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        volunteerId: user.volunteerId,
        name: volunteer ? volunteer.name : user.username,
      },
    };
  }
}
