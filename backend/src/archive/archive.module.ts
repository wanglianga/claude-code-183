import { Global, Injectable, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArchiveEvent, ArchiveEventType } from '../entities';

@Injectable()
export class ArchiveService {
  constructor(
    @InjectRepository(ArchiveEvent)
    private events: Repository<ArchiveEvent>,
  ) {}

  /** 向志愿者档案追加一条事件（报名/培训/排班/签到/服务/积分/兑换/回访等） */
  async record(
    volunteerId: number,
    type: ArchiveEventType,
    title: string,
    detail = '',
    refId: number = null,
  ) {
    await this.events.save(
      this.events.create({ volunteerId, type, title, detail, refId }),
    );
  }

  async timeline(volunteerId: number) {
    return this.events.find({
      where: { volunteerId },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }
}

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ArchiveEvent])],
  providers: [ArchiveService],
  exports: [ArchiveService],
})
export class ArchiveModule {}
