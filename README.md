# 城市社区银龄志愿服务报名排班积分兑换平台

面向社区银龄志愿者的一体化管理平台，覆盖 **报名 → 培训 → 排班 → 签到 → 服务 → 积分 → 兑换 → 关怀回访** 全流程，
所有环节汇聚到志愿者**同一条连续志愿档案**，便于排班，也能在发生身体不适或投诉时还原全过程。

技术栈：React 18 + Vite（前端）｜ NestJS 10 + TypeORM（后端）｜ PostgreSQL 15（数据库）｜ Docker Compose 一键启动。

## 一、一键启动（推荐，Docker）

```bash
docker compose up --build
```

启动后：

| 服务 | 地址 |
| --- | --- |
| 前端（志愿者端 + 社区端） | http://localhost:8080 |
| 后端 API | http://localhost:3000/api |
| 健康检查 | http://localhost:3000/api/health |

首次启动时 `seed` 容器会自动写入演示数据（6 名志愿者、6 类岗位、4 种奖励和一段完整演示流程）。
重新初始化数据：`docker compose run --rm seed node dist/seed-cli.js`。

## 二、测试账号

| 角色 | 用户名 | 密码 | 说明 |
| --- | --- | --- | --- |
| 社区工作人员 | `community` | `community123` | 发布岗位、推荐排班、服务确认、异常处置、兑换兑现、看板 |
| 平台管理员 | `admin` | `admin123` | 同社区权限 |
| 老年志愿者·王桂兰 | `wang` | `123456` | 68 岁，健康，已完成一次图书整理并兑换餐券 |
| 老年志愿者·李建国 | `li` | `123456` | 72 岁，高血压，保险 10 天后到期 |
| 老年志愿者·赵秀珍 | `zhao` | `123456` | 65 岁，健康 |
| 老年志愿者·陈德荣 | `chen` | `123456` | 78 岁，心脏病术后，只能安排低风险岗位 |
| 老年志愿者·刘惠敏 | `liu` | `123456` | 糖尿病、家属未知情、保险过期、未培训（多种拦截示例） |
| 老年志愿者·周明华 | `zhou` | `123456` | 健康但未投保 |

## 三、本地开发（无 Docker 时）

依赖：Node.js 20+、PostgreSQL 15。

```bash
# 1. 准备数据库
createdb -U postgres silvervolunteer   # 或自行建库建用户

# 2. 后端
cd backend
npm install
# 按实际情况配置数据库连接（默认 localhost:5432 silver/silver123）
DB_HOST=localhost DB_PORT=5432 DB_USER=silver DB_PASSWORD=silver123 \
DB_NAME=silvervolunteer npm run start:dev

# 3. 初始化演示数据（另开一个终端）
cd backend
DB_HOST=localhost DB_PORT=5432 DB_USER=silver DB_PASSWORD=silver123 \
DB_NAME=silvervolunteer npm run seed

# 4. 前端（另开一个终端）
cd frontend
npm install
npm run dev          # http://localhost:5173 ，/api 自动代理到 3000
```

后端环境变量：`DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME / DB_SYNC / JWT_SECRET / PORT`。

## 四、功能与业务规则

### 志愿者端
- **我的报名档案**：年龄、健康情况、擅长技能、可服务时间、紧急联系人、家属知情与高强度同意、培训记录、保险状态与到期日；档案可被社区暂停/恢复。
- **岗位大厅**：图书整理、文明劝导、助餐引导、儿童阅读陪伴、邻里调解、活动签到六类岗位；本人报名同样经过安全门槛校验，进入"待确认"名单。
- **我的排班服务**：服务当天签到；可登记临时缺勤、身体不适（自动暂停档案并入异常台账）、家属反对高强度服务（自动取消高风险排班）。
- **积分兑换**：食堂餐券、理发券、体检优惠、公益荣誉；库存不足不扣积分并预警；兑换无法兑现时积分原路退回；积分流水可查。
- **我的志愿历程**：报名到回访的全程时间线。

### 社区端
- **岗位发布**：地点、时长、风险等级、人数、积分规则、技能与培训要求；支持岗位"风险升级"，不再满足安全门槛的排班自动撤出并登记异常。
- **推荐排班**：综合**能力技能、距离、健康风险、培训合格、可服务时间、历史评价**打分并给出可解释依据；支持一键自动排班。
- **排班与服务**：确认报名 → 代签到 → 完成服务（志愿者上传照片说明或负责人确认）→ 积分自动入账（5 星好评加发 20% 奖励）；支持投诉登记。
- **异常处置与回访**：身体不适、缺勤、风险升级、投诉、保险过期、家属反对、库存不足七类异常，处置闭环并可恢复在队；健康/服务/投诉/例行四类关怀回访。
- **兑换兑现**：线下发券/核销后确认兑现，保证激励不"打白条"。
- **银龄队伍与连续档案**：查看每位志愿者报名信息、培训、保险、家属知情、全程时间线，可登记培训、回访、更新保险、暂停/恢复档案。
- **社区看板**：队伍稳定性（在岗率、出勤率、暂停原因）、服务覆盖（按岗位类别/风险等级）、**安全边界**（健康分层、保险有效、家属知情、待处置异常）、积分发放与**兑换兑现率**、关怀回访覆盖。

### 安全门槛（硬性拦截，不能仅靠时长评价）
1. 档案暂停（身体不适/家属原因）期间不排班；
2. 心脏病术后等脆弱健康状况只能低风险岗位，慢病不安排高风险岗位；
3. 高风险岗位必须**保险在有效期 + 家属明确同意**；慢病志愿者承担中风险岗位需家属知情；
4. 岗位要求培训合格（通用/专项）；同日服务时间冲突拦截；
5. 签到时再次校验保险，过期则拦截签到并自动登记异常；
6. 社区可查看拦截原因，保留"强制排班"入口但会在档案中留痕（不推荐）。

## 五、主要 API（均需 Bearer Token，前缀 `/api`）

- `POST /auth/login`、`GET /auth/me`
- 志愿者：`GET/PUT /volunteers/me/profile`、`GET /volunteers/me/points`、`GET /volunteers/me/timeline`
- 岗位：`GET/POST /jobs`、`GET /jobs/:id/recommend`、`POST /jobs/:id/apply`、`POST /jobs/:id/schedule`、`POST /jobs/:id/auto-schedule`、`POST /jobs/:id/escalate-risk`、`POST /jobs/:id/close`
- 服务：`GET /assignments`、`POST /assignments/:id/checkin`、`POST /assignments/:id/complete`、`/absent`、`/cancel`、`/complaint`
- 异常与回访：`GET/POST /incidents`、`POST /incidents/:id/resolve`、`POST /incidents/feel-unwell`、`POST /incidents/family-objection`、`GET /followups`、`POST /volunteers/:id/followups`
- 积分奖励：`GET/POST /rewards`、`POST /rewards/:id/redeem|restock`、`GET /redemptions`、`POST /redemptions/:id/fulfill|refund`
- 看板：`GET /stats/dashboard`
- 社区档案：`GET /volunteers`、`GET /volunteers/:id`、`GET /volunteers/:id/timeline`、`POST /volunteers/:id/trainings`

## 六、验证方式与已验证结论

> 下列结论均在本地实际执行验证（Node.js 22 + 用户态 PostgreSQL 15，后端直连数据库，API 经 curl 调用）。

实际执行并通过的验证：

1. **后端编译/类型检查**：`tsc --noEmit` 0 错误，`nest build` 成功；前端 `vite build` 成功（53 个模块，产物约 234 KB，gzip 72.5 KB）。
2. **一键端到端脚本** `bash e2e-check.sh`（23 项断言全部通过），覆盖：
   - 登录鉴权（无 token 401、志愿者访问社区接口 403）；
   - 陈德荣（心脏病术后）报名中风险岗位被健康门槛拦截；
   - 赵秀珍经社区排班 → 当天签到（保险校验）→ 照片凭证+5 星确认完成 → 积分 10 分（8 基础+2 好评）入账 → 兑换理发券 → 社区兑现，余额 10→2；
   - 文明劝导岗位风险升级为高风险，慢病李建国被自动撤出、排班取消并入异常；
   - 周明华上报身体不适 → 排班自动缺勤、档案自动暂停 → 社区处置闭环并恢复在队 → 健康关怀回访入档；
   - 看板稳定性/兑现率数据正确；赵秀珍连续档案时间线含 8 个环节，周明华档案同时含异常与回访环节。
3. **额外边界验证**：
   - 刘惠敏（保险过期）即使被强制排班，签到时仍被拦截并自动登记保险异常；
   - 兑换 0 库存奖励被拒、积分不扣减，同时生成"库存不足"异常并入本人档案；
   - 种子数据可重复执行（每次先清空全部业务表），重跑结果一致。
4. **前端产物**：`vite preview` 提供生产构建，SPA 路由回退返回 200。

> Docker 一键编排配置（`docker-compose.yml`，含 postgres/backend/seed/frontend 四服务与健康检查）已提供；
> 当前验证环境未安装 Docker，实际运行验证在等价的本地 Node 22 + PostgreSQL 15 环境完成。在装有 Docker 的机器上执行 `docker compose up --build` 即可复现，种子容器会等待后端健康检查通过后自动写入演示数据。

可在界面按以下路径手工复验：

- 用 `chen/123456` 登录，对"路口文明劝导"点"我要报名" → 看到健康安全拦截提示；
- 用 `community/community123` 登录 → 岗位发布 → "推荐排班"查看拦截原因与打分 → 确认排班；
- 服务当天用志愿者账号"签到" → 社区端"确认完成"（照片/负责人确认）→ 查看积分到账；
- 志愿者端"身体不适" → 档案自动暂停、排班记缺勤、社区端"异常处置"出现待处置项 → 处置并恢复在队 → 新增关怀回访；
- 岗位"风险升级"后查看不合适排班被自动撤出；
- "兑换兑现"中确认发券或选择"无法兑现"验证积分退回；社区看板查看兑现率与安全指标。

## 七、目录结构

```
.
├── docker-compose.yml        # 一键编排 postgres + backend + seed + frontend
├── backend/                  # NestJS + TypeORM
│   ├── Dockerfile
│   └── src/
│       ├── entities/         # 用户/志愿档案/培训/岗位/排班/异常/积分/奖励/兑换/回访
│       ├── common/safety.ts  # 健康分层、保险、家属等安全规则
│       ├── auth/ volunteers/ scheduling/ incidents/ rewards/ points/ stats/
│       └── seed-cli.ts       # 演示数据
└── frontend/                 # React + Vite（适老化大字号高对比界面）
    ├── Dockerfile + nginx.conf
    └── src/pages/{volunteer,community}/
```
