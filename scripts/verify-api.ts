import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";
const origin = process.env.TEST_ORIGIN || "http://localhost:3000";
const suffix = Date.now().toString(36);
const password = `StudyFlow-check-${suffix}`;
let cookieA = "", cookieB = "";
const usernames = [`qa_a_${suffix}`, `qa_b_${suffix}`];
async function call(path: string, method = "GET", value?: unknown, cookie = cookieA, useOrigin = origin) {
  const res = await fetch(`${origin}${path}`, { method, headers: { Origin: useOrigin, Cookie: cookie, "Content-Type": "application/json" }, ...(value ? { body: JSON.stringify(value) } : {}) });
  return { status: res.status, json: await res.json(), cookie: res.headers.get("set-cookie")?.split(";")[0] || "" };
}
let passed = 0;
function check(name: string, fn: () => void) { fn(); passed++; console.log(`PASS ${name}`); }
async function main() {
try {
  const unauth = await call("/api/dashboard", "GET", undefined, "");
  check("未登录不能读取学习数据", () => assert.equal(unauth.status, 401));
  const cross = await call("/api/auth/register", "POST", { username: usernames[0], password }, "", "http://evil.invalid");
  check("跨域写入被拒绝", () => assert.equal(cross.status, 403));
  const a = await call("/api/auth/register", "POST", { username: usernames[0], password, name: "验收账号 A" }, "");
  cookieA = a.cookie;
  check("本地注册设置 HttpOnly 会话", () => { assert.equal(a.status, 200); assert.ok(cookieA); });
  const b = await call("/api/auth/register", "POST", { username: usernames[1], password, name: "验收账号 B" }, "");
  cookieB = b.cookie;
  check("第二个用户注册", () => assert.equal(b.status, 200));
  const empty = await call("/api/dashboard");
  check("新账号没有伪造任务和学习记录", () => { assert.equal(empty.json.data.tasks.length, 0); assert.equal(empty.json.data.stats.todaySeconds, 0); });
  const plan = await call("/api/plans", "POST", { title: "验收：高等数学", goal: "验证持久化" });
  const task = await call("/api/tasks", "POST", { title: "验收：Stolz 定理练习", scheduledDate: empty.json.data.stats.today, subject: "高等数学", estimatedMinutes: 25, planId: plan.json.data.id });
  check("真实创建计划与任务", () => { assert.equal(plan.status, 200); assert.equal(task.status, 200); });
  const isolation = await call("/api/dashboard", "GET", undefined, cookieB);
  const steal = await call(`/api/tasks/${task.json.data.id}`, "PATCH", { completed: true }, cookieB);
  const foreignPlan = await call("/api/tasks", "POST", { title: "越权", scheduledDate: empty.json.data.stats.today, planId: plan.json.data.id }, cookieB);
  const foreignFocus = await call("/api/focus", "POST", { minutes: 1, taskId: task.json.data.id }, cookieB);
  check("读取、修改、计划关联和计时关联均隔离", () => { assert.equal(isolation.json.data.tasks.length, 0); assert.equal(steal.status, 404); assert.equal(foreignPlan.status, 404); assert.equal(foreignFocus.status, 404); });
  const invalid = await call("/api/tasks", "POST", { title: "无效日期", scheduledDate: "2026-02-30" });
  check("无效日期和字段被拒绝", () => assert.equal(invalid.status, 400));
  const start = await call("/api/focus", "POST", { minutes: 1, taskId: task.json.data.id });
  check("开始任务关联专注", () => assert.equal(start.status, 200));
  const duplicate = await call("/api/focus", "POST", { minutes: 1 });
  check("同一用户不能创建两个活动计时器", () => assert.equal(duplicate.status, 409));
  await setTimeout(1300);
  const paused = await call("/api/focus", "PATCH", { id: start.json.data.id, version: 0, action: "pause" });
  check("暂停记录真实经过时间", () => { assert.equal(paused.status, 200); assert.ok(paused.json.data.elapsedSeconds >= 1); assert.ok(paused.json.data.elapsedSeconds < 15); });
  const persisted = await call("/api/dashboard");
  check("重新读取后暂停状态仍然保留", () => { assert.equal(persisted.json.data.activeFocus.status, "PAUSED"); assert.equal(persisted.json.data.activeFocus.elapsedSeconds, paused.json.data.elapsedSeconds); });
  const stale = await call("/api/focus", "PATCH", { id: start.json.data.id, version: 0, action: "resume" });
  check("旧版本并发操作被拒绝", () => assert.equal(stale.status, 409));
  await setTimeout(700);
  const resumed = await call("/api/focus", "PATCH", { id: start.json.data.id, version: 1, action: "resume" });
  check("暂停期间不累计时长", () => { assert.equal(resumed.status, 200); assert.equal(resumed.json.data.elapsedSeconds, paused.json.data.elapsedSeconds); });
  await setTimeout(1100);
  const finish = await call("/api/focus", "PATCH", { id: start.json.data.id, version: 2, action: "finish" });
  const repeat = await call("/api/focus", "PATCH", { id: start.json.data.id, version: 2, action: "finish" });
  check("打卡保存实际时长且不能重复写入", () => { assert.equal(finish.status, 200); assert.equal(repeat.status, 409); assert.equal(finish.json.data.activeKey, null); });
  await call(`/api/tasks/${task.json.data.id}`, "PATCH", { completed: true });
  const final = await call("/api/dashboard");
  check("任务、完成率和真实专注统计闭环", () => { assert.equal(final.json.data.stats.todayCompleted, 1); assert.equal(final.json.data.stats.sessions, 1); assert.ok(final.json.data.stats.todaySeconds >= 2); assert.ok(final.json.data.stats.todaySeconds < 20); });
  if (!final.json.data.model.configured) {
    const offline = await call("/api/agent", "POST", { prompt: "为我制定学习计划" });
    check("无模型时返回未连接，不假冒生成成功", () => { assert.equal(offline.status, 503); assert.match(offline.json.error, /尚未连接/); });
  }
  await call("/api/auth/logout", "POST");
  const loggedOut = await call("/api/dashboard");
  check("退出后会话立即失效", () => assert.equal(loggedOut.status, 401));
  const login = await call("/api/auth/login", "POST", { username: usernames[0], password }, "");
  const recovered = await call("/api/dashboard", "GET", undefined, login.cookie);
  check("重新登录后记录持久化", () => { assert.equal(login.status, 200); assert.equal(recovered.json.data.tasks[0].completed, true); assert.equal(recovered.json.data.focus.length, 1); });
  console.log(`API acceptance: ${passed} checks passed. All QA accounts will be removed.`);
} finally {
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL || "file:./studyflow.db" });
  try { await db.user.deleteMany({ where: { username: { in: usernames } } }); } finally { await db.$disconnect(); }
}
}
main().catch(error => { console.error(error); process.exitCode = 1; });
