/**
 * 种子数据：构造典型银龄志愿场景并跑通一段演示流程。
 * 运行：npm run seed
 */
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { Job } from './entities/job.entity';
import { Reward } from './entities/reward.entity';
import { TrainingRecord } from './entities/training-record.entity';
import { User } from './entities/user.entity';
import { VolunteerProfile } from './entities/volunteer-profile.entity';
import { IncidentsService } from './incidents/incidents.service';
import { SchedulingService } from './scheduling/scheduling.service';
import { RewardsService } from './rewards/rewards.service';

function dateOffset(days: number): string {
  const d = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dateOfWeekday(weekday: 1 | 2 | 3 | 4 | 5): string {
  // 找最近（含今天起 7 天内）的指定 UTC 星期
  for (let i = 0; i < 7; i++) {
    const d = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + i);
    if (d.getUTCDay() === weekday) return d.toISOString().slice(0, 10);
  }
  return dateOffset(weekday);
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const ds = app.get(DataSource);

  console.log('清空旧数据...');
  await ds.query(
    'TRUNCATE users, volunteer_profiles, training_records, jobs, assignments, incidents, points_ledger, rewards, redemptions, followups RESTART IDENTITY CASCADE',
  );

  const hash = (p: string) => bcrypt.hash(p, 10);

  // ---------- 账号 ----------
  const community = await ds.getRepository(User).save(
    ds.getRepository(User).create({
      username: 'community',
      passwordHash: await hash('community123'),
      role: 'COMMUNITY',
      name: '社区工作人员',
      phone: '13800000000',
    }),
  );
  const admin = await ds.getRepository(User).save(
    ds.getRepository(User).create({
      username: 'admin',
      passwordHash: await hash('admin123'),
      role: 'ADMIN',
      name: '平台管理员',
    }),
  );
  void community;
  void admin;

  const volunteerSeed = [
    {
      username: 'wang', name: '王桂兰', age: 68, gender: '女', phone: '13911110001',
      address: '幸福里小区 3 号楼', distanceKm: 0.5, health: '健康',
      skills: ['图书整理', '儿童阅读陪伴'], timePrefs: ['周一上午', '周三上午', '周五上午'],
      emergencyContactName: '王小明（儿子）', emergencyContactPhone: '13700000001',
      familyAware: true, familyConsentHigh: true,
      insuranceStatus: 'VALID', insuranceExpireDate: dateOffset(120),
      trainings: [
        { course: '岗前通用培训', passed: true },
        { course: '儿童阅读陪伴专项', passed: true },
      ],
    },
    {
      username: 'li', name: '李建国', age: 72, gender: '男', phone: '13911110002',
      address: '安康小区 12 号楼', distanceKm: 1.2, health: '高血压（规律服药，病情稳定）',
      skills: ['文明劝导', '活动签到'], timePrefs: ['周二上午', '周四上午'],
      emergencyContactName: '李芳（女儿）', emergencyContactPhone: '13700000002',
      familyAware: true, familyConsentHigh: false,
      insuranceStatus: 'VALID', insuranceExpireDate: dateOffset(10),
      trainings: [{ course: '岗前通用培训', passed: true }],
    },
    {
      username: 'zhao', name: '赵秀珍', age: 65, gender: '女', phone: '13911110003',
      address: '幸福里小区 8 号楼', distanceKm: 0.9, health: '健康',
      skills: ['助餐引导', '邻里调解'], timePrefs: ['周一上午', '周三下午'],
      emergencyContactName: '赵强（儿子）', emergencyContactPhone: '13700000003',
      familyAware: true, familyConsentHigh: true,
      insuranceStatus: 'VALID', insuranceExpireDate: dateOffset(200),
      trainings: [{ course: '岗前通用培训', passed: true }],
    },
    {
      username: 'chen', name: '陈德荣', age: 78, gender: '男', phone: '13911110004',
      address: '安康小区 2 号楼', distanceKm: 1.1, health: '心脏病术后两年，不宜劳累',
      skills: ['图书整理'], timePrefs: ['周二上午'],
      emergencyContactName: '陈晨（孙女）', emergencyContactPhone: '13700000004',
      familyAware: true, familyConsentHigh: false,
      insuranceStatus: 'VALID', insuranceExpireDate: dateOffset(60),
      trainings: [{ course: '岗前通用培训', passed: true }],
    },
    {
      username: 'liu', name: '刘惠敏', age: 70, gender: '女', phone: '13911110005',
      address: '民乐小区 5 号楼', distanceKm: 3.5, health: '糖尿病',
      skills: ['助餐引导'], timePrefs: ['周五上午'],
      emergencyContactName: '刘洋（儿子）', emergencyContactPhone: '13700000005',
      familyAware: false, familyConsentHigh: false,
      insuranceStatus: 'EXPIRED', insuranceExpireDate: dateOffset(-20),
      trainings: [],
    },
    {
      username: 'zhou', name: '周明华', age: 63, gender: '男', phone: '13911110006',
      address: '幸福里小区 1 号楼', distanceKm: 0.3, health: '健康',
      skills: ['活动签到', '文明劝导'], timePrefs: ['周四上午', '周五上午'],
      emergencyContactName: '周丽（女儿）', emergencyContactPhone: '13700000006',
      familyAware: true, familyConsentHigh: true,
      insuranceStatus: 'NONE', insuranceExpireDate: null,
      trainings: [{ course: '岗前通用培训', passed: true }],
    },
  ] as const;

  const profileIds: Record<string, number> = {};
  for (const v of volunteerSeed) {
    const user = await ds.getRepository(User).save(
      ds.getRepository(User).create({
        username: v.username,
        passwordHash: await hash('123456'),
        role: 'VOLUNTEER',
        name: v.name,
        phone: v.phone,
      }),
    );
    const profile = await ds.getRepository(VolunteerProfile).save(
      ds.getRepository(VolunteerProfile).create({
        userId: user.id,
        name: v.name,
        age: v.age,
        gender: v.gender,
        phone: v.phone,
        address: v.address,
        distanceKm: v.distanceKm,
        health: v.health,
        skills: v.skills as any,
        timePrefs: v.timePrefs as any,
        emergencyContactName: v.emergencyContactName,
        emergencyContactPhone: v.emergencyContactPhone,
        familyAware: v.familyAware,
        familyConsentHigh: v.familyConsentHigh,
        insuranceStatus: v.insuranceStatus,
        insuranceExpireDate: v.insuranceExpireDate,
      }),
    );
    profileIds[v.username] = profile.id;
    for (const t of v.trainings) {
      await ds.getRepository(TrainingRecord).save(
        ds.getRepository(TrainingRecord).create({
          volunteerId: profile.id,
          course: t.course,
          passed: t.passed,
        }),
      );
    }
  }

  // ---------- 岗位（六类） ----------
  const monday = dateOfWeekday(1);
  const tuesday = dateOfWeekday(2);
  const wednesday = dateOfWeekday(3);
  const thursday = dateOfWeekday(4);
  const friday = dateOfWeekday(5);

  const jobs = await ds.getRepository(Job).save([
    ds.getRepository(Job).create({
      title: '社区书屋图书整理', category: '图书整理',
      location: '社区书屋', distanceKm: 0.6, durationHours: 2,
      riskLevel: 'LOW', capacity: 2, basePoints: 10,
      requiredSkills: ['图书整理'], requireTraining: true,
      serviceDate: monday, startTime: '09:00', endTime: '11:00',
      description: '协助归架、贴标、整理阅览区',
    }),
    ds.getRepository(Job).create({
      title: '路口文明劝导', category: '文明劝导',
      location: '幸福路与安康路交叉口', distanceKm: 1.0, durationHours: 2,
      riskLevel: 'MEDIUM', capacity: 2, basePoints: 15,
      requiredSkills: ['文明劝导'], requireTraining: true,
      serviceDate: tuesday, startTime: '08:30', endTime: '10:30',
      description: '非机动车停放引导、斑马线文明提醒，天气炎热注意防暑',
    }),
    ds.getRepository(Job).create({
      title: '长者食堂助餐引导', category: '助餐引导',
      location: '社区长者食堂', distanceKm: 0.8, durationHours: 1.5,
      riskLevel: 'LOW', capacity: 2, basePoints: 8,
      requiredSkills: ['助餐引导'], requireTraining: true,
      serviceDate: wednesday, startTime: '10:30', endTime: '12:00',
      description: '引导取餐、维持秩序、协助行动不便老人',
    }),
    ds.getRepository(Job).create({
      title: '四点半课堂儿童阅读陪伴', category: '儿童阅读陪伴',
      location: '社区活动中心亲子室', distanceKm: 0.7, durationHours: 2,
      riskLevel: 'LOW', capacity: 1, basePoints: 12,
      requiredSkills: ['儿童阅读陪伴'], requireTraining: true,
      requiredCourse: '儿童阅读陪伴专项',
      serviceDate: wednesday, startTime: '16:30', endTime: '18:30',
      description: '陪伴 6-10 岁儿童阅读绘本、维持课堂秩序',
    }),
    ds.getRepository(Job).create({
      title: '邻里矛盾调解协助', category: '邻里调解',
      location: '社区调解室', distanceKm: 1.2, durationHours: 2,
      riskLevel: 'MEDIUM', capacity: 1, basePoints: 15,
      requiredSkills: ['邻里调解'], requireTraining: true,
      serviceDate: thursday, startTime: '14:00', endTime: '16:00',
      description: '协助专职调解员做记录、情绪安抚',
    }),
    ds.getRepository(Job).create({
      title: '社区文化节活动签到', category: '活动签到',
      location: '社区文化广场', distanceKm: 0.5, durationHours: 3,
      riskLevel: 'LOW', capacity: 3, basePoints: 12,
      requiredSkills: ['活动签到'], requireTraining: true,
      serviceDate: friday, startTime: '08:00', endTime: '11:00',
      description: '嘉宾与居民签到、物料发放、路线指引',
    }),
  ]);

  // ---------- 积分奖励 ----------
  await ds.getRepository(Reward).save([
    ds.getRepository(Reward).create({
      name: '长者食堂餐券（15 元）', type: 'MEAL', points: 10, stock: 20,
      description: '可在社区长者食堂抵扣餐费',
    }),
    ds.getRepository(Reward).create({
      name: '爱心义剪理发券', type: 'HAIRCUT', points: 8, stock: 15,
      description: '每月 15 日社区义剪活动使用',
    }),
    ds.getRepository(Reward).create({
      name: '社区卫生服务中心体检 8 折优惠', type: 'HEALTHCHECK', points: 30, stock: 10,
      description: '基础体检套餐立减优惠',
    }),
    ds.getRepository(Reward).create({
      name: '银龄之星公益荣誉证书', type: 'HONOR', points: 50, stock: 5,
      description: '季度优秀银龄志愿者荣誉，可计入志愿服务时长认证',
    }),
  ]);

  // ---------- 演示流程 ----------
  const scheduling = app.get(SchedulingService);
  const rewardsSvc = app.get(RewardsService);
  const incidents = app.get(IncidentsService);

  // 1) 图书整理：自动排班（王桂兰、赵秀珍应入选；刘惠敏无培训/保险过期被拦）
  const auto = await scheduling.autoSchedule(jobs[0].id);
  console.log(`图书整理自动排班 ${auto.scheduled} 人`);

  // 2) 文明劝导（中风险）：李建国（高血压、家属已知情）可排
  await scheduling.schedule(jobs[1].id, profileIds.li);

  // 3) 王桂兰 签到 -> 负责人确认完成 -> 积分入账
  const wangAssignment = (await scheduling.listAssignments(
    jobs[0].id,
    profileIds.wang,
  ))[0];
  await scheduling.checkin(wangAssignment.id);
  await scheduling.complete(
    wangAssignment.id,
    { method: 'LEADER', proofNote: '负责人张姐现场确认，服务认真', rating: 5 },
    '社区工作人员',
  );

  // 4) 王桂兰兑换餐券并兑现
  const redemption = await rewardsSvc.redeem(profileIds.wang, 1);
  await rewardsSvc.fulfill(redemption.id, '社区工作人员');

  // 5) 服务后关怀回访
  await incidents.addFollowUp(
    profileIds.wang,
    {
      kind: 'SERVICE',
      content: '电话回访：服务后无疲劳不适，愿意继续参加书屋整理。',
      healthStatus: 'GOOD',
      continueWilling: true,
      assignmentId: wangAssignment.id,
    },
    '社区工作人员',
  );

  // 6) 刘惠敏保险过期异常（演示待处置事项）
  await incidents.insuranceExpired(
    profileIds.liu,
    '系统发现保险已于 20 天前过期，已暂停高风险岗位推荐，请联系家属续保。',
  );

  console.log('种子数据完成 ✅');
  console.log('社区账号: community / community123');
  console.log('志愿者账号: wang / 123456（其余 li zhao chen liu zhou 同密码）');
  await app.close();
}

bootstrap().catch((e) => {
  console.error(e);
  process.exit(1);
});
