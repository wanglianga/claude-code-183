import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.userRepo.findOne({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const token = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    });
    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        phone: user.phone,
      },
    };
  }

  async me(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const profile = await this.userRepo.manager
      .getRepository('VolunteerProfile')
      .findOne({ where: { userId: userId } });
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      phone: user.phone,
      volunteerProfileId: profile ? (profile as any).id : null,
    };
  }

  hashPassword(raw: string) {
    return bcrypt.hash(raw, 10);
  }
}
