import { Injectable, Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ArchiveEvent,
  Assignment,
  AssignmentStatus,
  FamilyConsent,
  HealthStatus,
  Insurance,
  PointsTransaction,
  PointsTxType,
  Position,
  PositionCategory,
  PositionStatus,
  RedemptionCategory,
  RedemptionItem,
  RiskLevel,
  TrainingRecord,
  User,
  UserRole,
  Volunteer,
  VolunteerStatus,
} from '../entities';
import { hashPassword } from '../auth/auth.controller';

function dateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 下一个指定星期（1=周一 … 7=周日）的日期，保证岗位日期落在志愿者可服务时间内 */
function nextWeekday(wd: number): string {
  const d = new Date();
  const cur = d.getDay() === 0 ? 7 : d.getDay();
  let diff = wd - cur;
  if (diff <= 0) diff += 7;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private log = new Logger('Seed');

  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Volunteer) private volunteers: Repository<Volunteer>,
    @InjectRepository(TrainingRecord) private trainings: Repository<TrainingRecord>,
    @InjectRepository(Insurance) private insurances: Repository<Insurance>,
    @InjectRepository(Position) private positions: Repository<Position>,
    @InjectRepository(Assignment) private assignments: Repository<Assignment>,
    @InjectRepository(PointsTransaction) private txs: Repository<PointsTransaction>,
    @InjectRepository(RedemptionItem) private items: Repository<RedemptionItem>,
    @InjectRepository(ArchiveEvent) private events: Repository<ArchiveEvent>,
  ) {}

  async onApplicationBootstrap() {
    const count = await this.users.count();
    if (count > 0) return;
    this.log.log('数据库为空，写入演示数据...');

    // 社区工作人员账号
    await this.users.save(
      this.users.create({
        username: 'admin',
        passwordHash: hashPassword('admin123'),
        role: UserRole.STAFF,
      }),
    );

    // ============ 志愿者 ============
    const seedVolunteers: Array<Partial<Volunteer> & { username: string }> = [
      {
        username: 'wangxiulan',
        name: '王秀兰',
        gender: '女',
        birthDate: '1958-03-12',
        phone: '13800000001',
        address: '幸福里小区 3 栋 502',
        maxDistanceKm: 3,
        healthStatus: HealthStatus.GOOD,
        healthNotes: '身体健康，无慢性病',
        skills: ['图书整理', '儿童阅读陪伴'],
        availableSlots: [
          { weekday: 1, periods: ['am'] },
          { weekday: 3, periods: ['am', 'pm'] },
          { weekday: 5, periods: ['am'] },
          { weekday: 6, periods: ['am', 'pm'] },
        ],
        emergencyContactName: '王强',
        emergencyContactPhone: '13900000001',
        emergencyContactRelation: '儿子',
        familyNotifyRequired: false,
        familyConsent: FamilyConsent.APPROVED,
      },
      {
        username: 'lijianguo',
        name: '李建国',
        gender: '男',
        birthDate: '1956-07-08',
        phone: '13800000002',
        address: '和平里社区 8 栋 201',
        maxDistanceKm: 5,
        healthStatus: HealthStatus.FAIR,
        healthNotes: '高血压，服药控制稳定',
        skills: ['文明劝导', '邻里调解'],
        availableSlots: [
          { weekday: 2, periods: ['am', 'pm'] },
          { weekday: 4, periods: ['am', 'pm'] },
          { weekday: 6, periods: ['pm'] },
        ],
        emergencyContactName: '李敏',
        emergencyContactPhone: '13900000002',
        emergencyContactRelation: '女儿',
        familyNotifyRequired: true,
        familyConsent: FamilyConsent.APPROVED,
      },
      {
        username: 'zhangguifang',
        name: '张桂芳',
        gender: '女',
        birthDate: '1960-11-25',
        phone: '13800000003',
        address: '阳光家园 12 栋 101',
        maxDistanceKm: 2,
        healthStatus: HealthStatus.GOOD,
        healthNotes: '身体健康',
        skills: ['助餐引导', '活动签到'],
        availableSlots: [
          { weekday: 1, periods: ['am', 'pm'] },
          { weekday: 2, periods: ['am'] },
          { weekday: 4, periods: ['am', 'pm'] },
          { weekday: 5, periods: ['am', 'pm'] },
        ],
        emergencyContactName: '赵军',
        emergencyContactPhone: '13900000003',
        emergencyContactRelation: '女婿',
        familyNotifyRequired: true,
        familyConsent: FamilyConsent.APPROVED,
      },
      {
        username: 'liudehai',
        name: '刘德海',
        gender: '男',
        birthDate: '1954-01-30',
        phone: '13800000004',
        address: '康乐小区 5 栋 303',
        maxDistanceKm: 2,
        healthStatus: HealthStatus.POOR,
        healthNotes: '冠心病史，需避免高强度活动',
        skills: ['图书整理'],
        availableSlots: [{ weekday: 3, periods: ['am'] }],
        emergencyContactName: '刘洋',
        emergencyContactPhone: '13900000004',
        emergencyContactRelation: '儿子',
        familyNotifyRequired: true,
        familyConsent: FamilyConsent.OPPOSED, // 家属反对高强度服务
      },
      {
        username: 'chenmeiling',
        name: '陈美玲',
        gender: '女',
        birthDate: '1961-05-16',
        phone: '13800000005',
        address: '文华苑 2 栋 1101',
        maxDistanceKm: 4,
        healthStatus: HealthStatus.GOOD,
        healthNotes: '身体健康，退休教师',
        skills: ['儿童阅读陪伴', '活动签到', '图书整理'],
        availableSlots: [
          { weekday: 1, periods: ['pm'] },
          { weekday: 3, periods: ['am', 'pm'] },
          { weekday: 6, periods: ['am', 'pm'] },
          { weekday: 7, periods: ['am'] },
        ],
        emergencyContactName: '周婷',
        emergencyContactPhone: '13900000005',
        emergencyContactRelation: '女儿',
        familyNotifyRequired: false,
        familyConsent: FamilyConsent.APPROVED,
      },
    ];

    const savedVolunteers: Volunteer[] = [];
    for (const sv of seedVolunteers) {
      const { username, ...data } = sv;
      const v = await this.volunteers.save(this.volunteers.create(data));
      savedVolunteers.push(v);
      await this.users.save(
        this.users.create({
          username,
          passwordHash: hashPassword('123456'),
          role: UserRole.VOLUNTEER,
          volunteerId: v.id,
        }),
      );
      await this.events.save(
        this.events.create({
          volunteerId: v.id,
          type: 'registration' as any,
          title: '报名登记成为银龄志愿者',
          detail: `技能：${(v.skills || []).join('、')}；健康状况：${v.healthStatus}；紧急联系人：${v.emergencyContactName}（${v.emergencyContactRelation}）；登录账号：${username}`,
        }),
      );
    }
    const [wang, li, zhang, liu, chen] = savedVolunteers;

    // ============ 培训记录 ============
    const trainings: Array<Partial<TrainingRecord>> = [
      { volunteerId: wang.id, title: '急救基础', trainedAt: dateStr(-90), qualified: true, expiresAt: dateStr(275), note: '红十字会急救员培训' },
      { volunteerId: wang.id, title: '儿童陪伴', trainedAt: dateStr(-60), qualified: true, expiresAt: dateStr(305) },
      { volunteerId: li.id, title: '调解技巧', trainedAt: dateStr(-120), qualified: true, expiresAt: dateStr(245) },
      { volunteerId: li.id, title: '急救基础', trainedAt: dateStr(-100), qualified: true, expiresAt: dateStr(265) },
      { volunteerId: zhang.id, title: '食品安全', trainedAt: dateStr(-45), qualified: true, expiresAt: dateStr(320) },
      { volunteerId: liu.id, title: '图书管理基础', trainedAt: dateStr(-200), qualified: true },
      { volunteerId: chen.id, title: '儿童陪伴', trainedAt: dateStr(-30), qualified: true, expiresAt: dateStr(335) },
      { volunteerId: chen.id, title: '急救基础', trainedAt: dateStr(-30), qualified: false, note: '考核未通过，待补考' },
    ];
    for (const t of trainings) {
      const saved = await this.trainings.save(this.trainings.create(t));
      await this.events.save(
        this.events.create({
          volunteerId: t.volunteerId,
          type: 'training' as any,
          title: `参加培训「${t.title}」${t.qualified ? '并考核合格' : '（未合格）'}`,
          detail: `培训日期：${t.trainedAt}`,
          refId: saved.id,
        }),
      );
    }

    // ============ 保险 ============
    const insurances: Array<Partial<Insurance>> = [
      { volunteerId: wang.id, provider: '中国人寿', policyNo: 'VB2026001', startDate: dateStr(-100), endDate: dateStr(265), coverage: '志愿服务意外险' },
      { volunteerId: li.id, provider: '平安保险', policyNo: 'VB2026002', startDate: dateStr(-100), endDate: dateStr(265), coverage: '志愿服务意外险' },
      { volunteerId: zhang.id, provider: '中国人寿', policyNo: 'VB2026003', startDate: dateStr(-100), endDate: dateStr(265), coverage: '志愿服务意外险' },
      { volunteerId: liu.id, provider: '太平洋保险', policyNo: 'VB2025004', startDate: dateStr(-465), endDate: dateStr(-100), coverage: '志愿服务意外险（已过期）' },
      { volunteerId: chen.id, provider: '平安保险', policyNo: 'VB2026005', startDate: dateStr(-100), endDate: dateStr(265), coverage: '志愿服务意外险' },
    ];
    for (const i of insurances) {
      const saved = await this.insurances.save(this.insurances.create(i));
      await this.events.save(
        this.events.create({
          volunteerId: i.volunteerId,
          type: 'insurance' as any,
          title: `登记保险 ${i.provider}（${i.policyNo}）`,
          detail: `有效期 ${i.startDate} 至 ${i.endDate}`,
          refId: saved.id,
        }),
      );
    }

    // ============ 岗位 ============
    const positions: Array<Partial<Position>> = [
      {
        title: '社区图书馆图书整理',
        category: PositionCategory.BOOK,
        location: '社区文化活动中心 2 楼图书馆',
        distanceKm: 0.5,
        serviceDate: nextWeekday(3),
        startTime: '09:00',
        endTime: '11:00',
        durationHours: 2,
        riskLevel: RiskLevel.LOW,
        headcount: 2,
        pointsPerHour: 10,
        requiredSkills: ['图书整理'],
        description: '整理归还图书、上架、贴标签，环境安静，劳动强度低',
      },
      {
        title: '主干道路口文明劝导',
        category: PositionCategory.CIVIL,
        location: '中山路与解放路交叉口',
        distanceKm: 1.5,
        serviceDate: nextWeekday(4),
        startTime: '16:00',
        endTime: '18:00',
        durationHours: 2,
        riskLevel: RiskLevel.MEDIUM,
        headcount: 2,
        pointsPerHour: 15,
        requiredSkills: ['文明劝导'],
        description: '晚高峰劝导行人非机动车遵守交通规则，需站立',
      },
      {
        title: '长者食堂助餐引导',
        category: PositionCategory.MEAL,
        location: '社区长者食堂',
        distanceKm: 0.8,
        serviceDate: nextWeekday(4),
        startTime: '10:30',
        endTime: '13:30',
        durationHours: 3,
        riskLevel: RiskLevel.LOW,
        headcount: 2,
        pointsPerHour: 12,
        requiredSkills: ['助餐引导'],
        requiredTraining: '食品安全',
        description: '引导老人就餐、协助打饭、维持秩序，需持食品安全培训合格证',
      },
      {
        title: '四点半课堂儿童阅读陪伴',
        category: PositionCategory.READING,
        location: '社区儿童之家',
        distanceKm: 1.2,
        serviceDate: nextWeekday(3),
        startTime: '16:30',
        endTime: '18:00',
        durationHours: 1.5,
        riskLevel: RiskLevel.LOW,
        headcount: 1,
        pointsPerHour: 12,
        requiredSkills: ['儿童阅读陪伴'],
        requiredTraining: '儿童陪伴',
        description: '陪伴双职工家庭孩子阅读绘本，需儿童陪伴培训合格',
      },
      {
        title: '邻里矛盾纠纷调解',
        category: PositionCategory.MEDIATION,
        location: '社区调解室',
        distanceKm: 1.0,
        serviceDate: nextWeekday(2),
        startTime: '14:00',
        endTime: '17:00',
        durationHours: 3,
        riskLevel: RiskLevel.HIGH,
        headcount: 1,
        pointsPerHour: 20,
        requiredSkills: ['邻里调解'],
        requiredTraining: '调解技巧',
        description: '协助调解邻里噪音纠纷，情绪对抗性强，需调解技巧培训与家属知情同意',
      },
      {
        title: '重阳节活动签到引导',
        category: PositionCategory.CHECKIN,
        location: '社区广场',
        distanceKm: 0.3,
        serviceDate: nextWeekday(6),
        startTime: '08:30',
        endTime: '11:30',
        durationHours: 3,
        riskLevel: RiskLevel.LOW,
        headcount: 2,
        pointsPerHour: 10,
        requiredSkills: ['活动签到'],
        description: '重阳节文艺汇演签到、引导入座',
      },
    ];
    const savedPositions: Position[] = [];
    for (const p of positions) {
      savedPositions.push(await this.positions.save(this.positions.create(p)));
    }

    // ============ 历史已完成服务（用于统计与评价） ============
    const pastPosition = await this.positions.save(
      this.positions.create({
        title: '上周图书馆整理（已结束）',
        category: PositionCategory.BOOK,
        location: '社区文化活动中心 2 楼图书馆',
        distanceKm: 0.5,
        serviceDate: dateStr(-7),
        startTime: '09:00',
        endTime: '11:00',
        durationHours: 2,
        riskLevel: RiskLevel.LOW,
        headcount: 2,
        pointsPerHour: 10,
        requiredSkills: ['图书整理'],
        status: PositionStatus.DONE,
      }),
    );
    const history: Array<{ v: Volunteer; rating: number; note: string }> = [
      { v: wang, rating: 5, note: '认真负责，整理规范' },
      { v: chen, rating: 4, note: '服务周到' },
    ];
    for (const h of history) {
      const points = 20;
      const a = await this.assignments.save(
        this.assignments.create({
          positionId: pastPosition.id,
          volunteerId: h.v.id,
          status: AssignmentStatus.COMPLETED,
          checkInAt: new Date(Date.now() - 7 * 86400000),
          completedAt: new Date(Date.now() - 7 * 86400000 + 2 * 3600000),
          confirmedBy: '社区工作人员-小周',
          rating: h.rating,
          reviewNote: h.note,
          pointsAwarded: points,
        }),
      );
      const vol = await this.volunteers.findOne({ where: { id: h.v.id } });
      vol.pointsBalance += points;
      await this.volunteers.save(vol);
      await this.txs.save(
        this.txs.create({
          volunteerId: h.v.id,
          type: PointsTxType.EARN,
          points,
          balanceAfter: vol.pointsBalance,
          refType: 'assignment',
          refId: a.id,
          note: '完成岗位「上周图书馆整理（已结束）」服务 2 小时',
        }),
      );
      await this.events.save(
        this.events.create({
          volunteerId: h.v.id,
          type: 'service' as any,
          title: '完成岗位「上周图书馆整理（已结束）」服务',
          detail: `时长 2 小时，评价 ${h.rating} 星：${h.note}`,
          refId: a.id,
        }),
      );
      await this.events.save(
        this.events.create({
          volunteerId: h.v.id,
          type: 'points' as any,
          title: `积分入账 +${points}`,
          detail: `来源：岗位服务，当前余额 ${vol.pointsBalance}`,
          refId: a.id,
        }),
      );
    }

    // ============ 积分兑换商品 ============
    const items: Array<Partial<RedemptionItem>> = [
      { name: '食堂餐券（10 元）', category: RedemptionCategory.MEAL, pointsCost: 30, stock: 20, description: '可在社区长者食堂使用的 10 元餐券' },
      { name: '爱心理发券', category: RedemptionCategory.HAIRCUT, pointsCost: 60, stock: 10, description: '社区爱心理发屋免费理发一次' },
      { name: '体检优惠（8 折）', category: RedemptionCategory.HEALTH, pointsCost: 150, stock: 5, description: '社区卫生服务中心体检套餐 8 折优惠' },
      { name: '公益荣誉证书', category: RedemptionCategory.HONOR, pointsCost: 300, stock: 0, description: '年度优秀银龄志愿者荣誉证书（制作中，暂缺货）' },
    ];
    for (const it of items) {
      await this.items.save(this.items.create(it));
    }

    this.log.log('演示数据写入完成：admin/admin123，志愿者账号 wangxiulan 等 /123456');
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Volunteer,
      TrainingRecord,
      Insurance,
      Position,
      Assignment,
      PointsTransaction,
      RedemptionItem,
      ArchiveEvent,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
