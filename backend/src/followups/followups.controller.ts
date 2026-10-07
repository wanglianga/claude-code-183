import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  CareFollowUp,
  FollowUpTrigger,
  Volunteer,
} from '../entities';
import { JwtAuthGuard, Roles } from '../auth/jwt.guard';
import { ArchiveService } from '../archive/archive.module';

class FollowUpDto {
  @IsInt()
  volunteerId: number;
  @IsOptional() @IsInt()
  assignmentId?: number;
  @IsIn(Object.values(FollowUpTrigger))
  trigger: FollowUpTrigger;
  @IsNotEmpty({ message: '回访内容不能为空' })
  content: string;
}

class DoneDto {
  @IsNotEmpty({ message: '请填写回访结果' })
  result: string;
  @IsOptional() @IsString()
  staffName?: string;
}

const TRIGGER_LABEL = {
  discomfort: '身体不适',
  absence: '临时缺勤',
  complaint: '投诉',
  risk_escalation: '风险升级',
  insurance_expired: '保险过期',
  family_opposition: '家属反对',
  manual: '主动回访',
};

@Controller('followups')
@UseGuards(JwtAuthGuard)
@Roles('staff')
export class FollowUpsController {
  constructor(
    @InjectRepository(CareFollowUp) private followUps: Repository<CareFollowUp>,
    @InjectRepository(Volunteer) private volunteers: Repository<Volunteer>,
    private archive: ArchiveService,
  ) {}

  @Get()
  async list() {
    const list = await this.followUps.find({ order: { id: 'DESC' } });
    const data = [];
    for (const f of list) {
      const v = await this.volunteers.findOne({ where: { id: f.volunteerId } });
      data.push({ ...f, volunteerName: v?.name, triggerLabel: TRIGGER_LABEL[f.trigger] });
    }
    return { code: 0, data };
  }

  @Post()
  async create(@Body() dto: FollowUpDto) {
    const v = await this.volunteers.findOne({ where: { id: dto.volunteerId } });
    if (!v) return { code: 404, message: '志愿者不存在' };
    const f = await this.followUps.save(this.followUps.create(dto as any));
    return { code: 0, data: f };
  }

  @Put(':id/done')
  async done(@Param('id', ParseIntPipe) id: number, @Body() dto: DoneDto) {
    const f = await this.followUps.findOne({ where: { id } });
    if (!f) return { code: 404, message: '回访任务不存在' };
    f.done = true;
    f.result = dto.result;
    if (dto.staffName) f.staffName = dto.staffName;
    await this.followUps.save(f);
    await this.archive.record(
      f.volunteerId,
      'followup' as any,
      `关怀回访（${TRIGGER_LABEL[f.trigger]}）`,
      `回访内容：${f.content}；回访结果：${dto.result}${dto.staffName ? `；回访人：${dto.staffName}` : ''}`,
      f.id,
    );
    return { code: 0, message: '回访已完成并记入档案' };
  }
}
