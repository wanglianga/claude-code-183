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
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import {
  PointsTransaction,
  PointsTxType,
  RedemptionCategory,
  RedemptionItem,
  RedemptionOrder,
  RedemptionStatus,
  Volunteer,
} from '../entities';
import { JwtAuthGuard, Roles } from '../auth/jwt.guard';
import { ArchiveService } from '../archive/archive.module';

class ItemDto {
  @IsNotEmpty({ message: '名称不能为空' })
  name: string;
  @IsIn(Object.values(RedemptionCategory))
  category: RedemptionCategory;
  @IsInt() @Min(1)
  pointsCost: number;
  @IsInt() @Min(0)
  stock: number;
  @IsOptional() @IsString()
  description?: string;
  @IsOptional() @IsBoolean()
  active?: boolean;
}

@Controller('redemptions')
@UseGuards(JwtAuthGuard)
export class RedemptionsController {
  constructor(
    @InjectRepository(RedemptionItem) private items: Repository<RedemptionItem>,
    @InjectRepository(RedemptionOrder) private orders: Repository<RedemptionOrder>,
    @InjectRepository(Volunteer) private volunteers: Repository<Volunteer>,
    @InjectRepository(PointsTransaction) private txs: Repository<PointsTransaction>,
    private archive: ArchiveService,
  ) {}

  @Get('items')
  async listItems() {
    const data = await this.items.find({ order: { id: 'ASC' } });
    return { code: 0, data };
  }

  @Post('items')
  @Roles('staff')
  async createItem(@Body() dto: ItemDto) {
    const it = await this.items.save(this.items.create(dto as Partial<RedemptionItem>));
    return { code: 0, data: it };
  }

  @Put('items/:id')
  @Roles('staff')
  async updateItem(@Param('id', ParseIntPipe) id: number, @Body() dto: ItemDto) {
    const it = await this.items.findOne({ where: { id } });
    if (!it) return { code: 404, message: '商品不存在' };
    Object.assign(it, dto);
    await this.items.save(it);
    return { code: 0, message: '保存成功' };
  }

  @Get('orders')
  async listOrders(@Req() req) {
    const where =
      req.user.role === 'volunteer' ? { volunteerId: req.user.volunteerId } : {};
    const list = await this.orders.find({ where, order: { id: 'DESC' } });
    const data = [];
    for (const o of list) {
      const v = await this.volunteers.findOne({ where: { id: o.volunteerId } });
      data.push({ ...o, volunteerName: v?.name });
    }
    return { code: 0, data };
  }

  /** 兑换：库存不足时订单失败并记入档案 */
  @Post('items/:id/redeem')
  async redeem(@Param('id', ParseIntPipe) id: number, @Req() req) {
    const volunteerId =
      req.user.role === 'volunteer' ? req.user.volunteerId : req.body?.volunteerId;
    if (!volunteerId) return { code: 400, message: '缺少志愿者信息' };
    const item = await this.items.findOne({ where: { id } });
    if (!item || !item.active) return { code: 404, message: '兑换项目不存在或已下架' };
    const v = await this.volunteers.findOne({ where: { id: volunteerId } });
    if (!v) return { code: 404, message: '志愿者不存在' };

    if (item.stock <= 0) {
      const order = await this.orders.save(
        this.orders.create({
          volunteerId,
          itemId: item.id,
          itemName: item.name,
          points: item.pointsCost,
          status: RedemptionStatus.FAILED,
          failReason: '库存不足',
        }),
      );
      await this.archive.record(
        volunteerId,
        'redemption' as any,
        `兑换「${item.name}」失败`,
        `失败原因：库存不足（需 ${item.pointsCost} 积分），积分未扣减`,
        order.id,
      );
      return { code: 400, message: '库存不足，兑换失败' };
    }
    if (v.pointsBalance < item.pointsCost) {
      return { code: 400, message: `积分不足（需 ${item.pointsCost}，当前 ${v.pointsBalance}）` };
    }

    item.stock -= 1;
    await this.items.save(item);
    v.pointsBalance -= item.pointsCost;
    await this.volunteers.save(v);
    await this.txs.save(
      this.txs.create({
        volunteerId,
        type: PointsTxType.REDEEM,
        points: -item.pointsCost,
        balanceAfter: v.pointsBalance,
        refType: 'redemption',
        refId: item.id,
        note: `兑换「${item.name}」`,
      }),
    );
    const order = await this.orders.save(
      this.orders.create({
        volunteerId,
        itemId: item.id,
        itemName: item.name,
        points: item.pointsCost,
        status: RedemptionStatus.FULFILLED,
      }),
    );
    await this.archive.record(
      volunteerId,
      'redemption' as any,
      `兑换「${item.name}」成功`,
      `消耗 ${item.pointsCost} 积分，剩余 ${v.pointsBalance}，库存剩余 ${item.stock}`,
      order.id,
    );
    return { code: 0, message: `兑换成功，消耗 ${item.pointsCost} 积分`, data: order };
  }
}
