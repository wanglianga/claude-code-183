#!/usr/bin/env bash
# 端到端冒烟：登录 -> 报名安全拦截 -> 社区排班 -> 签到 -> 完成发积分 -> 兑换/兑现
# -> 身体不适 -> 风险升级撤班 -> 看板与连续档案
# 前置：已运行种子数据。用法: API=http://localhost:3000/api bash e2e-check.sh
set -u
API="${API:-http://localhost:3000/api}"
PASS=0; FAIL=0
ok()   { echo "  ✅ $*"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $*"; FAIL=$((FAIL+1)); }
check(){ if [ "$1" = "$2" ]; then ok "$3 ($1)"; else bad "$3 期望[$2] 实际[$1]"; fi; }
jget(){ node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const o=JSON.parse(s);console.log(eval('o.'+process.argv[1]))}catch(e){console.log('')}})" "$1"; }
# 数组首元素提取（jget 的 eval 不支持数字索引，单独处理）
jfirst(){ node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const a=JSON.parse(s);console.log((a[0]&&a[0][process.argv[1]])??'')}catch(e){console.log('')}})" "$1"; }

login(){ curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' -d "{\"username\":\"$1\",\"password\":\"$2\"}" | jget token; }
post(){ curl -s -X POST "$API$1" -H "Authorization: Bearer $2" -H 'Content-Type: application/json' -d "$3"; }
get(){ curl -s "$API$1" -H "Authorization: Bearer $2"; }

echo "== 1. 登录鉴权 =="
CT=$(login community community123); [ -n "$CT" ] && ok "社区登录获得 token" || bad "社区登录失败"
ZT=$(login zhao 123456);      [ -n "$ZT" ] && ok "志愿者赵秀珍登录" || bad "赵秀珍登录失败"
CHT=$(login chen 123456)
LIT=$(login li 123456)
ZHT=$(login zhou 123456)

echo "== 2. 健康拦截：陈德荣（心脏病术后）报名中风险岗位应被拒 =="
R=$(post /jobs/2/apply "$CHT" '{}')
MSG=$(echo "$R" | jget message)
echo "$MSG" | grep -q "健康情况" && ok "中风险岗位健康拦截：$MSG" || bad "未拦截，返回：$R"

echo "== 3. 社区为助餐引导岗位(3) 安排赵秀珍(志愿者3) =="
R=$(post /jobs/3/schedule "$CT" '{"volunteerId":3}')
ST=$(echo "$R" | jget status)
check "$ST" "SCHEDULED" "赵秀珍排班状态"

AID=$(get /assignments "$ZT" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const a=JSON.parse(s).find(x=>x.jobId===3);console.log(a?a.id:'')})")
[ -n "$AID" ] && ok "找到排班记录 #$AID" || bad "未找到岗位3排班"

echo "== 4. 服务当天签到（赵秀珍保险有效） =="
R=$(post "/assignments/$AID/checkin" "$ZT" '{}')
check "$(echo "$R" | jget status)" "CHECKED_IN" "签到状态"

echo "== 5. 社区确认完成（照片凭证+5星），积分入账 =="
R=$(post "/assignments/$AID/complete" "$CT" '{"method":"PHOTO","proofNote":"上传2张助餐现场照片","rating":5}')
check "$(echo "$R" | jget status)" "COMPLETED" "完成状态"
PTS=$(echo "$R" | jget pointsAwarded)
[ "${PTS:-0}" -gt 0 ] && ok "发放积分 $PTS（8基础+2好评奖励）" || bad "未发放积分"

echo "== 6. 赵秀珍兑换理发券(2，8分)并由社区兑现 =="
BAL0=$(get /volunteers/me/profile "$ZT" | jget pointsBalance)
R=$(post /rewards/2/redeem "$ZT" '{}')
RID=$(echo "$R" | jget id)
[ -n "$RID" ] && ok "兑换单 #$RID 已创建（兑换前余额 $BAL0）" || bad "兑换失败：$R"
if [ -n "$RID" ]; then
  R=$(post "/redemptions/$RID/fulfill" "$CT" '{}')
  check "$(echo "$R" | jget status)" "FULFILLED" "兑换兑现"
  BAL1=$(get /volunteers/me/profile "$ZT" | jget pointsBalance)
  [ "$BAL1" -lt "$BAL0" ] && ok "积分扣减 $BAL0 -> $BAL1" || bad "积分未扣减"
fi

echo "== 7. 岗位风险升级：文明劝导岗位(2) 升为高风险，慢病李建国被自动撤出 =="
R=$(post /jobs/2/escalate-risk "$CT" '{"description":"高温橙色预警，户外劝导风险升高"}')
PULLED=$(echo "$R" | jget 'pulledVolunteers.length')
[ "${PULLED:-0}" -ge 1 ] && ok "李建国等 $PULLED 名不再安全的志愿者被撤出" || bad "未撤出任何人：$R"
LIJOB=$(get /assignments "$LIT" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const a=JSON.parse(s).find(x=>x.jobId===2);console.log(a?a.status:'')})")
check "$LIJOB" "CANCELLED" "李建国岗位2排班状态"

echo "== 8. 身体不适：周明华在活动签到岗位(6) 服务前上报 =="
R=$(post /jobs/6/schedule "$CT" '{"volunteerId":6}')
AID6=$(echo "$R" | jget id)
[ -n "$AID6" ] && ok "周明华已排班 #$AID6（低风险岗位不强制保险）" || bad "排班失败：$R"
R=$(post /incidents/feel-unwell "$ZHT" "{\"assignmentId\":$AID6,\"description\":\"突感头晕，停止服务休息\"}")
[ -n "$(echo "$R" | jget id)" ] && ok "身体不适异常已登记" || bad "登记失败：$R"
AST=$(get /assignments "$ZHT" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const a=JSON.parse(s).find(x=>x.jobId===6);console.log(a?a.status:'')})")
check "$AST" "ABSENT" "对应排班自动记缺勤"
check "$(get /volunteers/me/profile "$ZHT" | jget status)" "PAUSED" "档案自动暂停"

echo "== 9. 异常处置闭环并关怀回访，恢复在队 =="
INC=$(get '/incidents?volunteerId=6' "$CT" | jfirst id)
R=$(post "/incidents/$INC/resolve" "$CT" '{"resolution":"已电话回访，本人休息后恢复正常，家属知晓；同意恢复在队","resumeVolunteer":true}')
check "$(echo "$R" | jget status)" "RESOLVED" "异常处置闭环"
check "$(get /volunteers/me/profile "$ZHT" | jget status)" "ACTIVE" "处置后恢复在队"
R=$(post /volunteers/6/followups "$CT" '{"kind":"HEALTH","content":"次日电话回访，已无不适，家属表示感谢","healthStatus":"GOOD","continueWilling":true}')
[ -n "$(echo "$R" | jget id)" ] && ok "关怀回访已入档" || bad "回访失败：$R"

echo "== 10. 看板与连续档案 =="
D=$(get /stats/dashboard "$CT")
[ -n "$(echo "$D" | jget stability.total)" ] && ok "看板返回队伍稳定性数据" || bad "看板异常"
echo "  出勤率=$(echo "$D" | jget stability.attendanceRate)% 兑现率=$(echo "$D" | jget rewards.redemptions.fulfillmentRate)% 待处置异常=$(echo "$D" | jget safety.openIncidents)"
TLN=$(get /volunteers/3/timeline "$CT" | jget length)
[ "${TLN:-0}" -ge 6 ] && ok "赵秀珍连续档案时间线 $TLN 条（报名/培训/排班/签到/服务/积分/兑换）" || bad "时间线条目不足：$TLN"
STAGES=$(get /volunteers/6/timeline "$CT" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const t=JSON.parse(s);console.log([...new Set(t.map(e=>e.stage))].sort().join(','))})")
echo "$STAGES" | grep -q incident && echo "$STAGES" | grep -q followup && ok "周明华档案含异常与关怀回访环节：$STAGES" || bad "档案环节缺失：$STAGES"

echo
echo "结果：通过 $PASS，失败 $FAIL"
[ "$FAIL" -eq 0 ]
