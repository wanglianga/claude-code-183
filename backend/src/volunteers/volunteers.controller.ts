import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  ArchiveEvent,
  FamilyConsent,
  HealthStatus,
  Insurance,
  PointsTransaction,
  TrainingRecord,
  User,
  UserRole,
  Volunteer,
  VolunteerStatus,
} from '../entities';
import { JwtAuthGuard, Roles } from '../auth/jwt.guard';
import { ArchiveService } from '../archive/archive.module';
import { hashPassword } from '../auth/auth.controller';

export class VolunteerDto {
  @IsNotEmpty({ message: '姓名不能为空' })
  name: string;

  @IsOptional() @IsString()
  gender?: string;

  @IsNotEmpty({ message: '出生日期不能为空' })
  birthDate: string;

  @IsNotEmpty({ message: '联系电话不能为空' })
  phone: string;

  @IsOptional() @IsString()
  address?: string;

  @IsOptional() @IsNumber()
  maxDistanceKm?: number;

  @IsOptional() @IsIn([HealthStatus.GOOD, HealthStatus.FAIR, HealthStatus.POOR])
  healthStatus?: HealthStatus;

  @IsOptional() @IsString()
  healthNotes?: string;

  @IsOptional() @IsArray()
  skills?: string[];

  @IsOptional() @IsArray()
  availableSlots?: { weekday: number; periods: string[] }[];

  @IsOptional() @IsString()
  emergencyContactName?: string;

  @IsOptional() @IsString()
  emergencyContactPhone?: string;

  @IsOptional() @IsString()
  emergencyContactRelation?: string;

  @IsOptional() @IsBoolean()
  familyNotifyRequired?: boolean;

  @IsOptional() @IsIn([FamilyConsent.UNKNOWN, FamilyConsent.APPROVED, FamilyConsent.OPPOSED])
  familyConsent?: FamilyConsent;

  @IsOptional() @IsIn([VolunteerStatus.ACTIVE, VolunteerStatus.SUSPENDED])
  status?: VolunteerStatus;

  @IsOptional() @IsString()
  username?: string; // 登录账号（创建时）

  @IsOptional() @IsString()
  password?: string; // 登录密码（创建时）
}

export class TrainingDto {
  @IsNotEmpty({ message: '培训名称不能为空' })
  title: string;
  @IsNotEmpty({ message: '培训日期不能为空' })
  trainedAt: string;
  @IsBoolean()
  qualified: boolean;
  @IsOptional() @IsString()
  expiresAt?: string;
  @IsOptional() @IsString()
  note?: string;
}

export class InsuranceDto {
  @IsNotEmpty({ message: '保险公司不能为空' })
  provider: string;
  @IsNotEmpty({ message: '保单号不能为空' })
  policyNo: string;
  @IsNotEmpty({ message: '生效日期不能为空' })
  startDate: string;
  @IsNotEmpty({ message: '到期日期不能为空' })
  endDate: string;
  @IsOptional() @IsString()
  coverage?: string;
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function insuranceValid(ins: Insurance[]): boolean {
  const t = todayStr();
  return ins.some((i) => i.startDate <= t && i.endDate >= t);
}

export function ageOf(birthDate: string): number {
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

@Controller('volunteers')
@UseGuards(JwtAuthGuard)
export class VolunteersController {
  constructor(
    @InjectRepository(Volunteer) private volunteers: Repository<Volunteer>,
    @InjectRepository(TrainingRecord) private trainings: Repository<TrainingRecord>,
    @InjectRepository(Insurance) private insurances: Repository<Insurance>,
    @InjectRepository(PointsTransaction) private txs: Repository<PointsTransaction>,
    @InjectRepository(ArchiveEvent) private events: Repository<ArchiveEvent>,
    @InjectRepository(User) private users: Repository<User>,
    private archive: ArchiveService,
  ) {}

  private async decorate(v: Volunteer) {
    const ins = await this.insurances.find({ where: { volunteerId: v.id } });
    return {
      ...v,
      age: ageOf(v.birthDate),
      insuranceValid: insuranceValid(ins),
      latestInsurance: ins.sort((a, b) => (a.endDate < b.endDate ? 1 : -1))[0] || null,
    };
  }

  @Get()
  @Roles('staff')
  async list() {
    const all = await this.volunteers.find({ order: { id: 'ASC' } });
    const data = [];
    for (const v of all) data.push(await this.decorate(v));
    return { code: 0, data };
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number, @Req() req) {
    if (req.user.role !== 'staff' && req.user.volunteerId !== id) {
      return { code: 403, message: '无权查看他人档案' };
    }
    const v = await this.volunteers.findOne({ where: { id } });
    if (!v) return { code: 404, message: '志愿者不存在' };
    const trainings = await this.trainings.find({
      where: { volunteerId: id },
      order: { trainedAt: 'DESC' },
    });
    const insurances = await this.insurances.find({
      where: { volunteerId: id },
      order: { endDate: 'DESC' },
    });
    const pointsTxs = await this.txs.find({
      where: { volunteerId: id },
      order: { id: 'DESC' },
      take: 50,
    });
    const timeline = await this.events.find({
      where: { volunteerId: id },
      order: { id: 'DESC' },
      take: 200,
    });
    return {
      code: 0,
      data: {
        ...(await this.decorate(v)),
        trainings,
        insurances,
        pointsTxs,
        timeline,
      },
    };
  }

  @Post()
  @Roles('staff')
  async create(@Body() dto: VolunteerDto) {
    const exists = await this.volunteers.findOne({ where: { phone: dto.phone } });
    if (exists) return { code: 400, message: '该手机号已登记' };
    const v = await this.volunteers.save(this.volunteers.create(dto as Partial<Volunteer>));
    // 自动创建登录账号
    const username = dto.username || `v${String(v.id).padStart(4, '0')}`;
    const password = dto.password || '123456';
    await this.users.save(
      this.users.create({
        username,
        passwordHash: hashPassword(password),
        role: UserRole.VOLUNTEER,
        volunteerId: v.id,
      }),
    );
    await this.archive.record(
      v.id,
      'registration' as any,
      '报名登记成为银龄志愿者',
      `技能：${(v.skills || []).join('、') || '无'}；健康状况：${v.healthStatus}；` +
        `紧急联系人：${v.emergencyContactName || '-'}（${v.emergencyContactRelation || '-'}）；` +
        `${v.familyNotifyRequired ? '需要家属知情' : '无需家属知情'}；登录账号：${username}`,
    );
    return { code: 0, data: { id: v.id, username, password }, message: '登记成功' };
  }

  @Put(':id')
  @Roles('staff')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: VolunteerDto) {
    const v = await this.volunteers.findOne({ where: { id } });
    if (!v) return { code: 404, message: '志愿者不存在' };
    const before = { familyConsent: v.familyConsent, status: v.status };
    delete (dto as any).username;
    delete (dto as any).password;
    Object.assign(v, dto);
    await this.volunteers.save(v);
    if (before.familyConsent !== v.familyConsent && v.familyConsent === FamilyConsent.OPPOSED) {
      await this.archive.record(
        id,
        'alert' as any,
        '家属反对参与高强度服务',
        '家属表示反对该志愿者参与中高强度岗位，平台将限制其排班范围',
      );
    }
    return { code: 0, message: '保存成功' };
  }

  @Post(':id/trainings')
  @Roles('staff')
  async addTraining(@Param('id', ParseIntPipe) id: number, @Body() dto: TrainingDto) {
    const v = await this.volunteers.findOne({ where: { id } });
    if (!v) return { code: 404, message: '志愿者不存在' };
    const t = await this.trainings.save(this.trainings.create({ ...dto, volunteerId: id }));
    await this.archive.record(
      id,
      'training' as any,
      `参加培训「${dto.title}」${dto.qualified ? '并考核合格' : '（未合格）'}`,
      `培训日期：${dto.trainedAt}${dto.expiresAt ? `；有效期至：${dto.expiresAt}` : ''}`,
      t.id,
    );
    return { code: 0, data: t };
  }

  @Post(':id/insurances')
  @Roles('staff')
  async addInsurance(@Param('id', ParseIntPipe) id: number, @Body() dto: InsuranceDto) {
    const v = await this.volunteers.findOne({ where: { id } });
    if (!v) return { code: 404, message: '志愿者不存在' };
    const ins = await this.insurances.save(this.insurances.create({ ...dto, volunteerId: id }));
    const valid = dto.startDate <= todayStr() && dto.endDate >= todayStr();
    await this.archive.record(
      id,
      'insurance' as any,
      `登记保险 ${dto.provider}（${dto.policyNo}）`,
      `有效期 ${dto.startDate} 至 ${dto.endDate}，当前${valid ? '有效' : '已过期/未生效'}`,
      ins.id,
    );
    return { code: 0, data: ins };
  }
}
