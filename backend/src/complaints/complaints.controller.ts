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
  Assignment,
  CareFollowUp,
  Complaint,
  ComplaintStatus,
  FollowUpTrigger,
  Position,
  Volunteer,
} from '../entities';
import { JwtAuthGuard, Roles } from '../auth/jwt.guard';
import { ArchiveService } from '../archive/archive.module';

class ComplaintDto {
  @IsInt()
  volunteerId: number;
  @IsOptional() @IsInt()
  assignmentId?: number;
  @IsNotEmpty({ message: '投诉人不能为空' })
  complainant: string;
  @IsNotEmpty({ message: '投诉内容不能为空' })
  content: string;
}

class HandleDto {
  @IsIn([ComplaintStatus.PROCESSING, ComplaintStatus.RESOLVED])
  status: ComplaintStatus;
  @IsOptional() @IsString()
  handleNote?: string;
}

@Controller('complaints')
@UseGuards(JwtAuthGuard)
@Roles('staff')
export class ComplaintsController {
  constructor(
    @InjectRepository(Complaint) private complaints: Repository<Complaint>,
    @InjectRepository(Volunteer) private volunteers: Repository<Volunteer>,
    @InjectRepository(Assignment) private assignments: Repository<Assignment>,
    @InjectRepository(Position) private positions: Repository<Position>,
    @InjectRepository(CareFollowUp) private followUps: Repository<CareFollowUp>,
    private archive: ArchiveService,
  ) {}

  @Get()
  async list() {
    const list = await this.complaints.find({ order: { id: 'DESC' } });
    const data = [];
    for (const c of list) {
      const v = await this.volunteers.findOne({ where: { id: c.volunteerId } });
      let positionTitle = '';
      if (c.assignmentId) {
        const a = await this.assignments.findOne({ where: { id: c.assignmentId } });
        if (a) {
          const p = await this.positions.findOne({ where: { id: a.positionId } });
          positionTitle = p?.title || '';
        }
      }
      data.push({ ...c, volunteerName: v?.name, positionTitle });
    }
    return { code: 0, data };
  }

  @Post()
  async create(@Body() dto: ComplaintDto) {
    const v = await this.volunteers.findOne({ where: { id: dto.volunteerId } });
    if (!v) return { code: 404, message: '志愿者不存在' };
    const c = await this.complaints.save(this.complaints.create(dto as Partial<Complaint>));
    await this.archive.record(
      dto.volunteerId,
      'complaint' as any,
      `收到服务对象投诉（${dto.complainant}）`,
      dto.content,
      c.id,
    );
    await this.followUps.save(
      this.followUps.create({
        volunteerId: dto.volunteerId,
        assignmentId: dto.assignmentId || null,
        trigger: FollowUpTrigger.COMPLAINT,
        content: `服务对象（${dto.complainant}）投诉：${dto.content}。需回访志愿者核实情况并做好安抚与改进`,
      }),
    );
    return { code: 0, data: c, message: '投诉已登记并生成关怀回访任务' };
  }

  @Put(':id')
  async handle(@Param('id', ParseIntPipe) id: number, @Body() dto: HandleDto) {
    const c = await this.complaints.findOne({ where: { id } });
    if (!c) return { code: 404, message: '投诉不存在' };
    c.status = dto.status;
    if (dto.handleNote) c.handleNote = dto.handleNote;
    await this.complaints.save(c);
    if (dto.status === ComplaintStatus.RESOLVED) {
      await this.archive.record(
        c.volunteerId,
        'complaint' as any,
        '投诉处理完成',
        dto.handleNote || '已处理',
        c.id,
      );
    }
    return { code: 0, message: '已更新' };
  }
}
