import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { VolunteersService } from '../volunteers/volunteers.service';
import {
  CreateIncidentDto,
  FeelUnwellDto,
  FollowUpDto,
  ResolveDto,
} from './dto';
import { IncidentsService } from './incidents.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class IncidentsController {
  constructor(
    private readonly svc: IncidentsService,
    private readonly volunteers: VolunteersService,
  ) {}

  /** 异常台账（可按志愿者过滤） */
  @Get('incidents')
  list(@Query('volunteerId') volunteerId?: string) {
    return this.svc.list(volunteerId ? +volunteerId : undefined);
  }

  /** 关怀回访台账 */
  @Get('followups')
  listFollowUps(@Query('volunteerId') volunteerId?: string) {
    return this.svc.listFollowUps(volunteerId ? +volunteerId : undefined);
  }

  /** 通用异常登记（社区） */
  @Roles('COMMUNITY', 'ADMIN')
  @Post('incidents')
  create(@Req() req: any, @Body() dto: CreateIncidentDto) {
    return this.svc.create(dto, req.user.name);
  }

  /** 处置异常；resumeVolunteer=true 时同时恢复志愿者在队状态 */
  @Roles('COMMUNITY', 'ADMIN')
  @Post('incidents/:id/resolve')
  resolve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolveDto,
    @Req() req: any,
  ) {
    return this.svc.resolve(id, dto, req.user.name);
  }

  /** 服务当天身体不适：志愿者本人或社区登记，自动暂停档案并记录缺勤 */
  @Post('incidents/feel-unwell')
  async feelUnwell(
    @Req() req: any,
    @Body() body: FeelUnwellDto & { volunteerId?: number; assignmentId?: number },
  ) {
    const volunteerId =
      req.user.role === 'VOLUNTEER'
        ? (await this.volunteers.findByUserId(req.user.userId))?.id
        : body.volunteerId;
    return this.svc.feelUnwell(volunteerId, body.assignmentId ?? null, body);
  }

  /** 家属反对参与高强度服务：撤回高风险同意并取消对应排班 */
  @Post('incidents/family-objection')
  async familyObjection(
    @Req() req: any,
    @Body() body: FeelUnwellDto & { volunteerId?: number; assignmentId?: number },
  ) {
    const volunteerId =
      req.user.role === 'VOLUNTEER'
        ? (await this.volunteers.findByUserId(req.user.userId))?.id
        : body.volunteerId;
    return this.svc.familyObjection(
      volunteerId,
      body.assignmentId ?? null,
      body,
    );
  }

  /** 保险过期登记 */
  @Roles('COMMUNITY', 'ADMIN')
  @Post('incidents/insurance-expired')
  insurance(
    @Body() body: { volunteerId: number; description: string },
  ) {
    return this.svc.insuranceExpired(body.volunteerId, body.description);
  }

  /** 关怀回访登记 */
  @Roles('COMMUNITY', 'ADMIN')
  @Post('volunteers/:id/followups')
  followup(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FollowUpDto,
    @Req() req: any,
  ) {
    return this.svc.addFollowUp(id, dto, req.user.name);
  }
}
