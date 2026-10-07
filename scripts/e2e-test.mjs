/* 端到端业务流验证脚本：报名→培训→排班→签到→服务→积分→兑换→异常→回访→统计
 * 可重复执行：业务流在动态创建的岗位上进行，不污染种子数据 */
const BASE = process.env.API_BASE || 'http://localhost:3000/api';
let passed = 0, failed = 0;

function ok(name, cond, extra = '') {
  if (cond) { passed++; console.log(`  ✔ ${name}`); }
  else { failed++; console.log(`  ✘ ${name} ${extra}`); }
}

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function main() {
  console.log('== 1. 认证 ==');
  const adminLogin = await call('POST', '/auth/login', { body: { username: 'admin', password: 'admin123' } });
  ok('社区工作人员登录', adminLogin.code === 0 && adminLogin.data.token);
  const admin = adminLogin.data.token;

  const volLogin = await call('POST', '/auth/login', { body: { username: 'wangxiulan', password: '123456' } });
  ok('志愿者登录', volLogin.code === 0 && volLogin.data.user.volunteerId);
  const volToken = volLogin.data.token;
  const wangId = volLogin.data.user.volunteerId;

  const badLogin = await call('POST', '/auth/login', { body: { username: 'admin', password: 'wrong' } });
  ok('错误密码被拒绝', badLogin.code === 401);

  console.log('== 2. 志愿者档案 ==');
  const vols = await call('GET', '/volunteers', { token: admin });
  ok('志愿者列表', vols.code === 0 && vols.data.length >= 5);
  const liu = vols.data.find((v) => v.name === '刘德海');
  ok('刘德海保险失效被标记', liu && liu.insuranceValid === false);
  ok('刘德海家属反对高强度', liu && liu.familyConsent === 'opposed');
  const chenId = vols.data.find((v) => v.name === '陈美玲').id;

  // 新报名（随机手机号，保证脚本可重复执行）
  const randPhone = '137' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
  const reg = await call('POST', '/volunteers', {
    token: admin,
    body: {
      name: '测试老人', gender: '男', birthDate: '1959-05-01', phone: randPhone,
      address: '测试小区 1 栋', maxDistanceKm: 3, healthStatus: 'good',
      healthNotes: '健康', skills: ['活动签到'], availableSlots: [{ weekday: 1, periods: ['am'] }],
      emergencyContactName: '测试家属', emergencyContactPhone: '13711113333',
      emergencyContactRelation: '儿子', familyNotifyRequired: true, familyConsent: 'approved',
    },
  });
  ok('新志愿者报名登记', reg.code === 0 && reg.data.username);
  const newVolId = reg.data.id;

  const newVolLogin = await call('POST', '/auth/login', { body: { username: reg.data.username, password: '123456' } });
  ok('新志愿者账号可登录', newVolLogin.code === 0);

  const tr = await call('POST', `/volunteers/${newVolId}/trainings`, {
    token: admin,
    body: { title: '急救基础', trainedAt: '2026-09-01', qualified: true, expiresAt: '2027-09-01' },
  });
  ok('培训记录登记', tr.code === 0);

  const ins = await call('POST', `/volunteers/${newVolId}/insurances`, {
    token: admin,
    body: { provider: '测试保险', policyNo: 'TEST' + randPhone.slice(-6), startDate: '2026-01-01', endDate: '2027-12-31', coverage: '意外险' },
  });
  ok('保险登记', ins.code === 0);

  const detail = await call('GET', `/volunteers/${newVolId}`, { token: admin });
  ok('档案含报名/培训/保险事件',
    detail.data.timeline.some((e) => e.type === 'registration') &&
    detail.data.timeline.some((e) => e.type === 'training') &&
    detail.data.timeline.some((e) => e.type === 'insurance'));

  console.log('== 3. 岗位与智能推荐 ==');
  const positions = await call('GET', '/positions', { token: admin });
  ok('岗位列表（6 类岗位）', positions.data.length >= 6);
  const mediation = positions.data.find((p) => p.category === '邻里调解' && p.status !== 'done');
  const mealPos = positions.data.find((p) => p.category === '助餐引导');

  const recs = await call('GET', `/positions/${mediation.id}/recommendations`, { token: admin });
  ok('高风险岗位推荐列表', recs.code === 0 && recs.data.length >= 5);
  const liuRec = recs.data.find((r) => r.volunteer.name === '刘德海');
  ok('刘德海被高风险岗位硬性拦截（保险失效+家属反对+健康弱）',
    liuRec && !liuRec.eligible && liuRec.blockers.length >= 2, JSON.stringify(liuRec?.blockers));
  const liRec = recs.data.find((r) => r.volunteer.name === '李建国');
  ok('李建国适合调解岗位（有培训+家属同意）', liRec && liRec.eligible && liRec.score > 50, `score=${liRec?.score}`);

  const mealRecs = await call('GET', `/positions/${mealPos.id}/recommendations`, { token: admin });
  const wangMeal = mealRecs.data.find((r) => r.volunteer.name === '王秀兰');
  ok('王秀兰缺食品安全培训被助餐岗位拦截', wangMeal && !wangMeal.eligible);
  const zhangMeal = mealRecs.data.find((r) => r.volunteer.name === '张桂芳');
  ok('张桂芳有食品安全培训可排助餐岗', zhangMeal && zhangMeal.eligible);

  console.log('== 4. 排班→签到→服务→积分 ==');
  // 动态创建测试岗位，保证可重复执行
  async function createPosition(overrides = {}) {
    const res = await call('POST', '/positions', {
      token: admin,
      body: {
        title: '自动化测试岗位-' + Math.floor(Math.random() * 1e6),
        category: '活动签到', location: '测试地点', distanceKm: 1,
        serviceDate: tomorrow(), startTime: '09:00', endTime: '11:00',
        durationHours: 2, riskLevel: 'low', headcount: 3, pointsPerHour: 10,
        requiredSkills: [], requiredTraining: '', description: '自动化测试',
        ...overrides,
      },
    });
    return res.data;
  }

  const testPos = await createPosition();
  ok('创建测试岗位', !!testPos && !!testPos.id);

  const assign = await call('POST', '/assignments', {
    token: admin,
    body: { positionId: testPos.id, volunteerId: wangId, score: 88, note: '测试排班' },
  });
  ok('排班成功', assign.code === 0, assign.message);
  const assignmentId = assign.data.id;

  const dupAssign = await call('POST', '/assignments', {
    token: admin, body: { positionId: testPos.id, volunteerId: wangId },
  });
  ok('重复排班被拒绝', dupAssign.code === 400);

  const checkin = await call('POST', `/assignments/${assignmentId}/checkin`, { token: volToken, body: {} });
  ok('志愿者签到', checkin.code === 0);

  const before = await call('GET', `/volunteers/${wangId}`, { token: admin });
  const complete = await call('POST', `/assignments/${assignmentId}/complete`, {
    token: admin,
    body: { confirmedBy: '社区工作人员-小周', rating: 5, reviewNote: '服务认真' },
  });
  ok('负责人确认完成，积分入账', complete.code === 0 && complete.data.points === 20);
  const after = await call('GET', `/volunteers/${wangId}`, { token: admin });
  ok('积分余额增加 20', after.data.pointsBalance === before.data.pointsBalance + 20);
  ok('档案含签到/服务/积分事件',
    after.data.timeline.some((e) => e.type === 'checkin') &&
    after.data.timeline.some((e) => e.type === 'service') &&
    after.data.timeline.some((e) => e.type === 'points'));

  console.log('== 5. 积分兑换 ==');
  const items = await call('GET', '/redemptions/items', { token: volToken });
  const mealCoupon = items.data.find((i) => i.category === '食堂餐券');
  const honor = items.data.find((i) => i.category === '公益荣誉');
  ok('兑换商品含 4 类', ['食堂餐券', '理发券', '体检优惠', '公益荣誉'].every((c) => items.data.some((i) => i.category === c)));

  // 积分不足时先通过服务补足（保证脚本可重复执行）
  let balance = (await call('GET', `/volunteers/${wangId}`, { token: admin })).data.pointsBalance;
  while (balance < mealCoupon.pointsCost) {
    const p = await createPosition();
    const a = await call('POST', '/assignments', { token: admin, body: { positionId: p.id, volunteerId: wangId } });
    await call('POST', `/assignments/${a.data.id}/complete`, { token: admin, body: { confirmedBy: '补分' } });
    balance = (await call('GET', `/volunteers/${wangId}`, { token: admin })).data.pointsBalance;
  }
  const redeemOk = await call('POST', `/redemptions/items/${mealCoupon.id}/redeem`, { token: volToken });
  ok('兑换餐券成功', redeemOk.code === 0, redeemOk.message);
  const redeemFail = await call('POST', `/redemptions/items/${honor.id}/redeem`, { token: volToken });
  ok('库存不足兑换失败', redeemFail.code === 400);
  const orders = await call('GET', '/redemptions/orders', { token: volToken });
  ok('失败订单记录原因=库存不足', orders.data.some((o) => o.status === 'failed' && o.failReason === '库存不足'));
  const afterRedeem = await call('GET', `/volunteers/${wangId}`, { token: admin });
  ok('档案含兑换事件（成功+失败）',
    afterRedeem.data.timeline.filter((e) => e.type === 'redemption').length >= 2);

  console.log('== 6. 异常场景 ==');
  // 身体不适取消
  const posA = await createPosition();
  const assign2 = await call('POST', '/assignments', {
    token: admin, body: { positionId: posA.id, volunteerId: newVolId },
  });
  ok('测试老人排班成功', assign2.code === 0, assign2.message);
  const cancel = await call('POST', `/assignments/${assign2.data.id}/cancel`, {
    token: admin, body: { reason: '身体不适，头晕无法参加' },
  });
  ok('身体不适取消排班', cancel.code === 0);
  const followUps1 = await call('GET', '/followups', { token: admin });
  ok('自动生成身体不适关怀回访', followUps1.data.some((f) => f.trigger === 'discomfort' && f.volunteerId === newVolId));

  // 临时缺勤
  const posB = await createPosition();
  const assign3 = await call('POST', '/assignments', {
    token: admin, body: { positionId: posB.id, volunteerId: chenId },
  });
  ok('陈美玲排班成功', assign3.code === 0, assign3.message);
  const absent = await call('POST', `/assignments/${assign3.data.id}/absent`, {
    token: admin, body: { reason: '临时家中有事未到岗' },
  });
  ok('标记临时缺勤', absent.code === 0);
  const followUps2 = await call('GET', '/followups', { token: admin });
  ok('缺勤生成关怀回访', followUps2.data.some((f) => f.trigger === 'absence'));

  // 投诉
  const complaint = await call('POST', '/complaints', {
    token: admin,
    body: { volunteerId: wangId, assignmentId, complainant: '图书馆读者张大爷', content: '反映整理书籍时声音偏大' },
  });
  ok('登记投诉', complaint.code === 0);
  const followUps3 = await call('GET', '/followups', { token: admin });
  ok('投诉生成关怀回访', followUps3.data.some((f) => f.trigger === 'complaint' && f.volunteerId === wangId));
  const handleC = await call('PUT', `/complaints/${complaint.data.id}`, {
    token: admin, body: { status: 'resolved', handleNote: '已沟通提醒，志愿者表示注意' },
  });
  ok('投诉办结', handleC.code === 0);

  // 回访完成
  const fu = followUps3.data.find((f) => f.trigger === 'complaint' && f.volunteerId === wangId && !f.done);
  const doneFu = await call('PUT', `/followups/${fu.id}/done`, {
    token: admin, body: { result: '已电话回访，志愿者情绪良好，表示会注意轻声', staffName: '小周' },
  });
  ok('完成关怀回访并归档', doneFu.code === 0);
  const wangDetail = await call('GET', `/volunteers/${wangId}`, { token: admin });
  ok('档案含投诉与回访事件',
    wangDetail.data.timeline.some((e) => e.type === 'complaint') &&
    wangDetail.data.timeline.some((e) => e.type === 'followup'));

  // 岗位风险升级
  const posC = await createPosition({ title: '风险升级测试岗-' + Math.floor(Math.random() * 1e6) });
  const assign4 = await call('POST', '/assignments', {
    token: admin, body: { positionId: posC.id, volunteerId: chenId },
  });
  ok('风险岗位排班（升级前）', assign4.code === 0, assign4.message);
  const escalate = await call('PUT', `/positions/${posC.id}`, {
    token: admin,
    body: {
      title: posC.title, category: posC.category, location: posC.location,
      distanceKm: posC.distanceKm, serviceDate: posC.serviceDate,
      startTime: posC.startTime, endTime: posC.endTime,
      durationHours: posC.durationHours, riskLevel: 'high',
      headcount: posC.headcount, pointsPerHour: posC.pointsPerHour,
      requiredSkills: [], requiredTraining: '急救基础',
      description: '升级为高风险',
    },
  });
  ok('岗位风险升级', escalate.code === 0);
  const posAfter = await call('GET', `/positions/${posC.id}`, { token: admin });
  const chenAssign = posAfter.data.assignments.find((a) => a.id === assign4.data.id);
  ok('风险升级后不合格志愿者排班被取消（陈美玲急救培训未合格）',
    chenAssign && chenAssign.status === 'cancelled', chenAssign?.cancelReason);
  const followUps4 = await call('GET', '/followups', { token: admin });
  ok('风险升级生成关怀回访', followUps4.data.some((f) => f.trigger === 'risk_escalation'));

  console.log('== 7. 统计看板 ==');
  const stats = await call('GET', '/stats/dashboard', { token: admin });
  ok('队伍稳定性指标', stats.data.team.total >= 6 && typeof stats.data.team.absenceRate === 'number');
  ok('服务覆盖 6 类岗位', stats.data.coverage.length === 6);
  ok('安全提醒含保险失效名单', stats.data.alerts.expiredInsurance.some((x) => x.name === '刘德海'));
  ok('兑换失败统计', stats.data.alerts.failedRedemptions >= 1);

  console.log('== 8. 权限控制 ==');
  const forbidden = await call('GET', '/volunteers', { token: volToken });
  ok('志愿者不能访问社区端列表', forbidden.statusCode === 403 || forbidden.code === 403);
  const noAuth = await call('GET', '/volunteers');
  ok('未登录被拒绝', noAuth.statusCode === 401);
  const otherDetail = await call('GET', `/volunteers/${newVolId}`, { token: volToken });
  ok('志愿者不能查看他人档案', otherDetail.code === 403);
  const ownDetail = await call('GET', `/volunteers/${wangId}`, { token: volToken });
  ok('志愿者可查看本人档案', ownDetail.code === 0);
  const mine = await call('GET', '/assignments/mine', { token: volToken });
  ok('志愿者查看我的任务', mine.code === 0 && mine.data.length >= 1);

  console.log(`\n结果：${passed} 通过，${failed} 失败`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
