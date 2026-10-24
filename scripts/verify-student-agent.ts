import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { db } from "../src/lib/db";
import { sendMessage } from "../src/modules/student-agent/service";
import type { ChatModel } from "../src/modules/agent/provider";

// 默认不调用云模型；--live-model 必须在用户同意使用现有服务额度后显式启用。
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:3000";
const keep = process.argv.includes("--keep-account");
const live = process.argv.includes("--live-model");
const suffix = Date.now().toString(36);
const password = randomBytes(18).toString("hex");
const users: string[] = [];
const usernames = [`sa_qa_a_${suffix}`, `sa_qa_b_${suffix}`];
let cookie = "";
let passed = 0;
async function call(path: string, method = "GET", input?: unknown, auth = cookie, requestOrigin = origin) {
  const r = await fetch(`${origin}${path}`, { method, headers: { Origin: requestOrigin, Cookie: auth, "Content-Type": "application/json" }, ...(input ? { body: JSON.stringify(input) } : {}) });
  return { status: r.status, body: await r.json(), cookie: r.headers.get("set-cookie")?.split(";")[0] ?? "" };
}
function check(name: string, condition: unknown) { assert.ok(condition, name); passed++; console.log(`PASS ${name}`); }
async function main() {
  let success = false;
  try {
    check("资料未登录不可读取", (await call("/api/materials")).status === 401);
    check("会话未登录不可读取", (await call("/api/student-agent")).status === 401);
    check("未登录发送不可调用模型", (await call("/api/student-agent", "POST", { message: "未登录" })).status === 401);
    const a = await call("/api/auth/register", "POST", { username: usernames[0], password, name: live ? "QA真实模型验收" : "QA受控模型验收" });
    assert.equal(a.status, 200); users.push(a.body.data.id); cookie = a.cookie;
    const b = await call("/api/auth/register", "POST", { username: usernames[1], password, name: "QA隔离验收" });
    assert.equal(b.status, 200); users.push(b.body.data.id);
    check("空资料和空会话真实为空", (await call("/api/materials")).body.data.length === 0 && (await call("/api/student-agent")).body.data.conversations.length === 0);
    check("跨来源资料写入被拒", (await call("/api/materials", "POST", {}, cookie, "https://evil.invalid")).status === 403);
    check("非法资料被拒", (await call("/api/materials", "POST", { title: "空正文", subject: "数学", text: "太短" })).status === 400);
    check("非法消息被拒，不调用模型", (await call("/api/student-agent", "POST", { message: "" })).status === 400);
    const imported = await call("/api/materials", "POST", { title: "QA自写极限讲义", subject: "高等数学", text: "极限定义：先给定任意正数 epsilon，再寻找合适的正数 delta。当零小于 x 与 a 的距离且该距离小于 delta 时，函数值与极限的距离必须小于 epsilon。\n\n这是一份自写的接口验收资料，仅用于检查检索、原文位置和会话恢复，不是正式教材。" });
    assert.equal(imported.status, 200);
    const materialId = imported.body.data.id;
    check("资料导入并保留真实段落", (await call(`/api/materials/${materialId}`)).body.data.chunks[0].locator === "第 1 段");
    check("其他账号读取和删除资料被拒", (await call(`/api/materials/${materialId}`, "GET", undefined, b.cookie)).status === 404 && (await call(`/api/materials/${materialId}`, "DELETE", undefined, b.cookie)).status === 404);
    let stage = 0;
    const controlled: ChatModel = async messages => {
      const name = ["search_materials", "record_learning_observation", "create_plan"][stage];
      const args = [{ query: "极限定义" }, { topic: "极限定义", observation: "用户自述不理解定义，需后续诊断；这是受控验收数据。", evidence: "我不理解极限定义" }, { title: "QA学习与生活待办", goal: "受控验收，需手动确认", tasks: [{ title: "复习极限定义", subject: "高等数学", scheduledDate: "2026-10-21", estimatedMinutes: 25 }, { title: "晚间散步", subject: "生活", scheduledDate: "2026-10-21", estimatedMinutes: 20 }] }][stage];
      stage++;
      if (stage === 2) assert.match(messages.at(-1)!.content!, /QA自写极限讲义/);
      if (!name) return { content: "【受控模型界面验收】\n根据检索到的自写讲义第 1 段，epsilon 先给定，delta 随之选择。\n请你解释：为什么不能先固定一个 delta，就要求它满足所有 epsilon？\n\n我还生成了复习与散步的待办提议，尚未执行。请在下方审阅确认。" };
      return { content: null, tool_calls: [{ id: `qa-${stage}`, type: "function", function: { name, arguments: JSON.stringify(args) } }] };
    };
    const message = "我不理解极限定义，请查资料问我一个问题，并将这个困惑记录为待验证学习观察，再帮我安排明天复习和散步。";
    const result = live
      ? (await call("/api/student-agent", "POST", { message, allowMaterials: true })).body.data
      : await sendMessage(users[0], { message, allowMaterials: true }, controlled);
    assert.ok(result, "生成接口没有返回有效数据");
    assert.equal(result.failed, false);
    const conversationId = result.conversation.id;
    const restored = await call(`/api/student-agent?id=${conversationId}`);
    const actualTrace = restored.body.data.messages[1].trace as { name: string; ok: boolean }[];
    check("会话接口恢复实际工具执行结果", restored.status === 200 && ["search_materials", "record_learning_observation", "create_plan"].every(name => actualTrace.some(t => t.name === name && t.ok)));
    check("其他账号不能读取会话", (await call(`/api/student-agent?id=${conversationId}`, "GET", undefined, b.cookie)).status === 404);
    const dashboard = await call("/api/dashboard");
    check("计划仍待确认，未直接新增任务", dashboard.body.data.tasks.length === 0 && dashboard.body.data.agentRuns[0].status === "PENDING");
    const home = await call("/api/student-agent");
    const evidence = home.body.data.observations[0]?.evidence;
    check("学习观察保留真实原话证据", typeof evidence === "string" && evidence.length >= 3 && message.includes(evidence));
    check("其他账号看不到观察", (await call("/api/student-agent", "GET", undefined, b.cookie)).body.data.observations.length === 0);
    if (live) {
      mkdirSync("test-results/student-agent", { recursive: true });
      writeFileSync("test-results/student-agent/live-evidence.json", JSON.stringify({ checkedAt: new Date().toISOString(), message, conversation: result.conversation, pending: dashboard.body.data.agentRuns.map((r: { analysis: string; proposal: unknown }) => ({ analysis: r.analysis, proposal: r.proposal })), taskCountBeforeApproval: dashboard.body.data.tasks.length }, null, 2));
    }
    if (keep) {
      mkdirSync("test-results/student-agent", { recursive: true });
      writeFileSync("test-results/student-agent/qa-account.json", JSON.stringify({ username: usernames[0], password, userId: users[0], conversationId, materialId }));
      console.log(`Browser QA account saved locally; model mode: ${live ? "REAL" : "CONTROLLED"}.`);
    } else {
      check("本人删除资料成功", (await call(`/api/materials/${materialId}`, "DELETE")).status === 200);
      check("本人删除观察成功", (await call("/api/student-agent", "DELETE", { kind: "observation", id: home.body.data.observations[0].id })).status === 200);
      check("本人删除会话成功", (await call("/api/student-agent", "DELETE", { kind: "conversation", id: conversationId })).status === 200);
    }
    success = true;
    console.log(`Student Agent API checks: ${passed} passed. ${live ? "REAL cloud model turn verified." : "No cloud model was called."}`);
  } finally {
    await db.user.deleteMany({ where: { id: { in: success && keep ? users.slice(1) : users } } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "QA failed"); process.exitCode = 1; });
