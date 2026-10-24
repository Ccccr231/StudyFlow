import { test } from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/modules/identity/service";
import { propose, decide } from "../src/modules/agent/service";
import { updateTask } from "../src/modules/planning/service";
import type { ModelProvider } from "../src/modules/agent/provider";
// 测试替身只验证审批事务，不计为真实模型验收。不写用户数据。
test("Agent 提议隔离、审批、冲突和重复确认", async () => {
  const suffix = Date.now().toString(36);
  const users: string[] = [];
  const provider: ModelProvider = { async propose() { return { analysis: "测试替身：仅验证工具审批", proposal: [{ name: "create_plan", arguments: { title: "测试路线", goal: "验收", tasks: [{ title: "测试任务", subject: "测试", scheduledDate: "2026-10-18", estimatedMinutes: 25 }] } }] }; } };
  try {
    for (const n of ["a", "b"]) { const user = await db.user.create({ data: { username: `agent_qa_${n}_${suffix}`, name: "测试账号", passwordHash: await hashPassword(`testing-password-${suffix}`) } }); users.push(user.id); }
    const run = await propose(users[0], "测试提议", provider);
    assert.equal(await db.task.count({ where: { userId: users[0] } }), 0, "生成后不直接修改");
    await assert.rejects(decide(users[1], run.id, true), /提议不存在/);
    const applied = await decide(users[0], run.id, true);
    assert.equal(applied.status, "APPLIED");
    assert.equal(await db.task.count({ where: { userId: users[0] } }), 1);
    await assert.rejects(decide(users[0], run.id, true), /已处理/);
    const run2 = await propose(users[0], "冲突提议", provider);
    const task = await db.task.findFirstOrThrow({ where: { userId: users[0] } });
    await updateTask(users[0], task.id, { completed: true });
    await assert.rejects(decide(users[0], run2.id, true), /学习数据已变化/);
    assert.equal((await db.agentRun.findUniqueOrThrow({ where: { id: run2.id } })).status, "PENDING", "失败事务回滚提议状态");
    assert.equal(await db.task.count({ where: { userId: users[0] } }), 1);
    await decide(users[0], run2.id, false);
    const run3 = await propose(users[0], "过期提议", provider);
    await db.agentRun.update({ where: { id: run3.id }, data: { createdAt: new Date(Date.now() - 86400001) } });
    await assert.rejects(decide(users[0], run3.id, true), /提议已过期/);
    const invalid: ModelProvider = { async propose() { return { analysis: "不合法", proposal: [{ name: "update_tasks", arguments: { changes: [{ id: "foreign-or-fabricated", estimatedMinutes: 5 }] } }] }; } };
    await assert.rejects(propose(users[0], "越权提议", invalid), /不存在的任务/);
    const run4 = await propose(users[0], "并发确认", provider);
    const results = await Promise.allSettled([decide(users[0], run4.id, true), decide(users[0], run4.id, true)]);
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    assert.equal(await db.task.count({ where: { userId: users[0] } }), 2);
  } finally { await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect(); }
});
