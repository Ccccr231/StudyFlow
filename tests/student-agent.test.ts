import { test } from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { addMaterial, deleteMaterial, readMaterial, searchMaterials, splitMaterial, rankChunks } from "../src/modules/knowledge/service";
import { sendMessage, readConversation, removeAgentItem, agentHome } from "../src/modules/student-agent/service";
import { decide } from "../src/modules/agent/service";
import type { ChatModel, ModelReply } from "../src/modules/agent/provider";

const tool = (name: string, args: unknown, id = name): ModelReply => ({ content: null, tool_calls: [{ id, type: "function", function: { name, arguments: JSON.stringify(args) } }] });
const reply = (content: string): ModelReply => ({ content });

test("文字分段保留位置、覆盖全文且不伪造页码；词项检索不返回无关资料", () => {
  const text = "甲".repeat(16000);
  const chunks = splitMaterial(text);
  assert.ok(chunks.length < 25);
  assert.equal(chunks.at(-1)?.text.at(-1), "甲");
  assert.equal(chunks[0].locator.includes("页"), false);
  assert.ok(chunks.every(c => c.text.length <= 900));
  const input = [{ title: "高数", subject: "数学", text: "极限的定义涉及任意的正数 epsilon 与对应的 delta。" }, { title: "运动", subject: "生活", text: "今天跑步三十分钟，注意休息。" }];
  assert.equal(rankChunks("极限定义", input)[0]?.title, "高数");
  assert.equal(rankChunks("quantumxyz", input).length, 0);
});

// 受控模型响应只驱动真实工具和数据库，不能作为真实云模型验收证据。
test("学习 Agent：资料隔离、工具反馈、会话恢复、观察证据、计划审批、失败恢复与预算", async () => {
  const users: string[] = [];
  const suffix = Date.now().toString(36);
  try {
    for (const name of ["a", "b"]) users.push((await db.user.create({ data: { username: `student_qa_${name}_${suffix}`, name: "Agent 验收", passwordHash: "test-only-no-login" } })).id);
    const [a, b] = users;
    const material = await addMaterial(a, { title: "验收自写讲义", subject: "高等数学", text: "极限定义：对任意正数 epsilon，都存在正数 delta，使得当零小于 x 与 a 的距离且该距离小于 delta 时，函数值与极限的距离小于 epsilon。\n\n这是自写验收文本，不是正式教材。" });
    assert.equal((await searchMaterials(b, "极限")).length, 0);
    await assert.rejects(readMaterial(b, material.id), /资料不存在/);
    await assert.rejects(deleteMaterial(b, material.id), /资料不存在/);
    assert.equal((await readMaterial(a, material.id)).chunks[0].locator, "第 1 段");

    let step = 0;
    const teaching: ChatModel = async messages => {
      step++;
      if (step === 1) return tool("search_materials", { query: "极限定义" });
      if (step === 2) {
        const results = JSON.parse(messages.at(-1)!.content!);
        assert.equal(results.sources[0].materialId, material.id, "真实检索结果必须反馈模型");
        assert.match(results.sources[0].text, /epsilon/);
        return tool("record_learning_observation", { topic: "极限定义", observation: "用户自述混淆量词顺序，需要继续验证。", evidence: "我不懂极限定义" });
      }
      assert.match(messages.at(-1)!.content!, /待验证/);
      return reply("受控验收回答：先解释一下，你认为 epsilon 和 delta 谁先给定？");
    };
    const first = await sendMessage(a, { message: "我不懂极限定义，请根据资料先问我一个问题。", allowMaterials: true }, teaching);
    assert.equal(first.failed, false);
    assert.equal(step, 3);
    const conversationId = first.conversation.id;
    const saved = await readConversation(a, conversationId);
    assert.equal(saved.messages.length, 2);
    assert.match(saved.messages[1].content, /epsilon/);
    assert.equal((saved.messages[1].trace as { name: string }[])[0].name, "search_materials");
    await assert.rejects(readConversation(b, conversationId), /会话不存在/);
    assert.equal((await agentHome(b)).observations.length, 0);
    assert.equal((await agentHome(a)).observations[0].evidence, "我不懂极限定义");

    await sendMessage(a, { conversationId, message: "我觉得是 epsilon 先给定。" }, async messages => {
      assert.ok(messages.some(m => m.role === "assistant" && m.content?.includes("epsilon")), "恢复会话必须包含前文");
      assert.match(messages[0].content!, /用户自述混淆量词顺序/);
      return reply("受控验收回答：接下来用一道新题验证。");
    });

    let forbiddenStep = 0;
    await sendMessage(a, { conversationId, message: "继续解释极限。", allowMaterials: false }, async messages => {
      if (++forbiddenStep === 1) return tool("search_materials", { query: "极限" });
      assert.match(messages.at(-1)!.content!, /未授权/);
      assert.doesNotMatch(messages.at(-1)!.content!, /对任意正数/);
      return reply("受控验收回答：本轮没有使用课程资料。");
    });

    const count = await db.learningObservation.count({ where: { userId: a } });
    let forgedStep = 0;
    await sendMessage(a, { conversationId, message: "继续。" }, async messages => {
      if (++forgedStep === 1) return tool("record_learning_observation", { topic: "高数", observation: "虚构观察", evidence: "已经完全掌握所有内容" });
      assert.match(messages.at(-1)!.content!, /逐字引用/);
      return reply("受控验收回答：没有保存无依据观察。");
    });
    assert.equal(await db.learningObservation.count({ where: { userId: a } }), count);

    let planStep = 0;
    const planned = await sendMessage(a, { conversationId, message: "帮我安排明天运动和复习。" }, async messages => {
      if (++planStep === 1) return tool("create_plan", { title: "明日学习与生活", goal: "测试", tasks: [{ title: "运动", subject: "生活", scheduledDate: "2026-10-21", estimatedMinutes: 30 }] });
      assert.equal(JSON.parse(messages.at(-1)!.content!).status, "PENDING");
      return reply("受控验收回答：提议已生成，等你确认。");
    });
    assert.equal(planned.failed, false);
    assert.equal(await db.task.count({ where: { userId: a } }), 0);
    const pending = await db.agentRun.findFirstOrThrow({ where: { userId: a, status: "PENDING" } });
    await decide(a, pending.id, true);
    assert.equal(await db.task.count({ where: { userId: a } }), 1);

    let failedStep = 0;
    const failed = await sendMessage(a, { conversationId, message: "再生成一个复习计划。" }, async () => {
      if (++failedStep === 1) return tool("create_plan", { title: "失败恢复", goal: "测试", tasks: [{ title: "复习", subject: "数学", scheduledDate: "2026-10-21", estimatedMinutes: 20 }] });
      throw new Error("controlled network failure");
    });
    assert.equal(failed.failed, true);
    assert.equal(failed.conversation.messages.at(-1)?.role, "error");
    assert.match(failed.conversation.messages.at(-1)!.content, /提议仍在/);
    assert.equal(await db.agentRun.count({ where: { userId: a, status: "PENDING" } }), 1);

    let loops = 0;
    const bounded = await sendMessage(a, { conversationId, message: "测试不合法工具。" }, async messages => {
      loops++;
      if (loops > 1) assert.match(messages.at(-1)!.content!, /不在允许范围/);
      return tool("execute_shell", { command: "never executed" }, `loop-${loops}`);
    });
    assert.equal(bounded.failed, true);
    assert.equal(loops, 5, "必须在预算内停止循环");
    assert.equal(await db.task.count({ where: { userId: a } }), 1);

    await db.agentConversation.update({ where: { id: conversationId }, data: { leaseId: "other-request", leaseUntil: new Date(Date.now() + 60000) } });
    await assert.rejects(sendMessage(a, { conversationId, message: "并发消息" }, async () => reply("不应执行")), /正在处理/);
    await assert.rejects(removeAgentItem(a, "conversation", conversationId), /正在处理/);
    await db.agentConversation.update({ where: { id: conversationId }, data: { leaseId: null, leaseUntil: null } });
    await deleteMaterial(a, material.id);
    assert.equal((await searchMaterials(a, "极限")).length, 0);
    await removeAgentItem(a, "conversation", conversationId);
    assert.equal(await db.learningObservation.count({ where: { userId: a } }), 0);
  } finally {
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  }
});
