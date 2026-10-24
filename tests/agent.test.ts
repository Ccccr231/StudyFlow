import { test } from "node:test";
import assert from "node:assert/strict";
import { proposalSchema, CompatibleModel, chatModel } from "../src/modules/agent/provider";
test("Agent 不接受未知工具、无效日期、空调整和过量任务", () => {
  assert.equal(proposalSchema.safeParse([{ name: "execute_shell", arguments: { cmd: "rm" } }]).success, false);
  assert.equal(proposalSchema.safeParse([{ name: "update_tasks", arguments: { changes: [{ id: "abc" }] } }]).success, false);
  assert.equal(proposalSchema.safeParse([{ name: "update_tasks", arguments: { changes: [{ id: "abc", scheduledDate: "2026-02-30" }] } }]).success, false);
  assert.equal(proposalSchema.safeParse([{ name: "create_plan", arguments: { title: "极限", goal: "学习", tasks: Array.from({ length: 31 }, () => ({ title: "练习", subject: "数学", scheduledDate: "2026-10-18", estimatedMinutes: 25 })) } }]).success, false);
  assert.equal(proposalSchema.safeParse([{ name: "update_tasks", arguments: { changes: [{ id: "abc", scheduledDate: "2026-10-19", completed: true }] } }]).success, false);
});

test("共用模型传输校验响应，普通聊天可回答但不能伪装成计划提议", async () => {
  const previous = { base: process.env.MODEL_BASE_URL, name: process.env.MODEL_NAME, key: process.env.MODEL_API_KEY, fetch: globalThis.fetch };
  process.env.MODEL_BASE_URL = "http://127.0.0.1:9/v1";
  process.env.MODEL_NAME = "controlled-transport-test";
  process.env.MODEL_API_KEY = "controlled-not-a-real-key";
  let calls = 0;
  try {
    globalThis.fetch = async (url, init) => {
      calls++;
      assert.equal(String(url), "http://127.0.0.1:9/v1/chat/completions");
      assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer controlled-not-a-real-key");
      return Response.json({ choices: [{ message: { content: "受控普通回答" } }] });
    };
    assert.equal((await chatModel([{ role: "user", content: "测试" }], [])).content, "受控普通回答");
    await assert.rejects(new CompatibleModel().propose({ prompt: "测试", snapshot: {}, analysis: "测试" }), /没有返回有效工具提议/);
    globalThis.fetch = async () => new Response("not json");
    await assert.rejects(chatModel([], []), /返回格式无效/);
    globalThis.fetch = async () => new Response("x".repeat(200001));
    await assert.rejects(chatModel([], []), /返回内容过大/);
    process.env.MODEL_BASE_URL = "file:///not-allowed";
    await assert.rejects(chatModel([], []), /模型地址配置无效/);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = previous.fetch;
    for (const [key, value] of [["MODEL_BASE_URL", previous.base], ["MODEL_NAME", previous.name], ["MODEL_API_KEY", previous.key]]) {
      if (value === undefined) delete process.env[key!]; else process.env[key!] = value;
    }
  }
});
test("没有模型配置时明确报错，不能产生虚假计划", async () => {
  const previous = process.env.MODEL_BASE_URL;
  delete process.env.MODEL_BASE_URL;
  try { await assert.rejects(new CompatibleModel().propose({ prompt: "帮我规划", snapshot: {}, analysis: "无学习记录" }), /尚未连接.*模型/); }
  finally { if (previous) process.env.MODEL_BASE_URL = previous; }
});
