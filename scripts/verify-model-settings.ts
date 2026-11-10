import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const origin = process.env.TEST_ORIGIN || "http://localhost:3000";
const suffix = Date.now().toString(36);
const usernames = [`key_api_a_${suffix}`, `key_api_b_${suffix}`];
const db = new PrismaClient();
const fakeKey = `acceptance-only-not-a-real-key-${suffix}`;
let passed = 0;
async function call(path: string, method = "GET", cookie = "", value?: unknown, requestOrigin = origin) {
  const response = await fetch(`${origin}${path}`, { method, headers: { Origin: requestOrigin, Cookie: cookie, "Content-Type": "application/json" }, ...(value === undefined ? {} : { body: JSON.stringify(value) }) });
  const text = await response.text();
  assert.ok(!text.includes(fakeKey), "API 不得回显密钥");
  return { status: response.status, json: JSON.parse(text), cookie: response.headers.get("set-cookie")?.split(";")[0] || "" };
}
function check(name: string, fn: () => void) { fn(); passed++; console.log(`PASS ${name}`); }
async function main() {
  try {
    const unauthenticated = await call("/api/model-settings");
    check("未登录不能读取模型设置", () => assert.equal(unauthenticated.status, 401));
    const cookies: string[] = [];
    for (const username of usernames) {
      const result = await call("/api/auth/register", "POST", "", { username, name: "密钥接口验收", password: `acceptance-password-${suffix}` });
      assert.equal(result.status, 200);
      assert.ok(result.cookie);
      cookies.push(result.cookie);
    }
    const [a, b] = cookies;
    const config = { provider: "deepseek", model: "deepseek-flash", apiKey: fakeKey };
    const cross = await call("/api/model-settings", "PUT", a, config, "https://evil.invalid");
    check("跨站配置写入被拒绝", () => assert.equal(cross.status, 403));
    const invalid = await call("/api/model-settings", "PUT", a, { ...config, baseUrl: "http://127.0.0.1" });
    check("拒绝自定义内网地址和额外字段", () => assert.equal(invalid.status, 400));
    const saved = await call("/api/model-settings", "PUT", a, config);
    check("个人配置保存成功且不回显密钥", () => { assert.equal(saved.status, 200); assert.equal(saved.json.data.configured, true); });
    const user = await db.user.findUniqueOrThrow({ where: { username: usernames[0] } });
    const stored = await db.userModelSetting.findUniqueOrThrow({ where: { userId: user.id } });
    check("数据库没有明文密钥", () => assert.ok(!JSON.stringify(stored).includes(fakeKey)));
    const own = await call("/api/dashboard", "GET", a);
    const other = await call("/api/model-settings", "GET", b);
    check("配置按账号隔离并显示到工作台", () => { assert.equal(own.json.data.model.configured, true); assert.equal(other.json.data.configured, false); });
    await call("/api/model-settings", "DELETE", b);
    const kept = await call("/api/model-settings", "GET", a);
    check("其他账号移除操作不影响当前用户", () => assert.equal(kept.json.data.configured, true));
    const removed = await call("/api/model-settings", "DELETE", a);
    const agent = await call("/api/agent", "POST", a, { prompt: "请制定一个计划" });
    const student = await call("/api/student-agent", "POST", a, { message: "你好" });
    check("移除后两个 AI 入口均停止调用", () => { assert.equal(removed.json.data.configured, false); assert.equal(agent.status, 503); assert.equal(student.status, 503); });
    console.log(`Model settings acceptance: ${passed} checks passed; no real model requests made.`);
  } finally {
    await db.user.deleteMany({ where: { username: { in: usernames } } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
