import { test } from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { encryptApiKey, decryptApiKey, saveModelSettings, userModelConfig, userModelStatus, removeModelSettings, modelSettingsInput } from "../src/modules/agent/settings";
import { userChatModel } from "../src/modules/agent/provider";
import { propose } from "../src/modules/agent/service";
import { sendMessage } from "../src/modules/student-agent/service";

test("个人模型密钥加密、账号隔离、两个 AI 入口与移除生效", async () => {
  const previousKey = process.env.MODEL_ENCRYPTION_KEY;
  const previousFetch = globalThis.fetch;
  process.env.MODEL_ENCRYPTION_KEY = "ab".repeat(32);
  const users: string[] = [];
  const suffix = Date.now().toString(36);
  try {
    const encrypted = encryptApiKey("alice", "test-key-alice");
    assert.equal(decryptApiKey("alice", encrypted), "test-key-alice");
    assert.notEqual(encrypted, encryptApiKey("alice", "test-key-alice"));
    assert.throws(() => decryptApiKey("bob", encrypted), /无法解密/);
    assert.throws(() => decryptApiKey("alice", encrypted.slice(0, -3) + "AAA"), /无法解密/);
    assert.equal(modelSettingsInput.safeParse({ provider: "custom", model: "test", apiKey: "test-key", baseUrl: "http://127.0.0.1" }).success, false);
    assert.equal(modelSettingsInput.safeParse({ provider: "deepseek", model: "test", apiKey: "test\r\nkey" }).success, false);
    for (const n of ["a", "b"]) users.push((await db.user.create({ data: { username: `key_qa_${n}_${suffix}`, name: "密钥验收", passwordHash: "test-only" } })).id);
    const [a, b] = users;
    assert.equal((await userModelStatus(a)).configured, false);
    await assert.rejects(userModelConfig(a), /自己的 API Key/);
    await saveModelSettings(a, { provider: "deepseek", model: "test-deepseek", apiKey: "test-key-alice" });
    await saveModelSettings(b, { provider: "openai", model: "test-openai", apiKey: "test-key-bob" });
    const stored = await db.userModelSetting.findUniqueOrThrow({ where: { userId: a } });
    assert.ok(!JSON.stringify(stored).includes("test-key-alice"));
    assert.ok(!JSON.stringify(await userModelStatus(a)).includes("test-key-alice"));
    assert.equal((await userModelConfig(b)).apiKey, "test-key-bob");
    const seen: string[] = [];
    globalThis.fetch = async (url, init) => {
      const key = new Headers(init?.headers).get("Authorization")!;
      const payload = JSON.parse(String(init?.body));
      assert.equal(key, payload.model === "test-deepseek" ? "Bearer test-key-alice" : "Bearer test-key-bob");
      assert.equal(new URL(String(url)).hostname, payload.model === "test-deepseek" ? "api.deepseek.com" : "api.openai.com");
      seen.push(key);
      const message = payload.tools?.length === 2
        ? { content: "受控计划", tool_calls: [{ id: "one", type: "function", function: { name: "create_plan", arguments: JSON.stringify({ title: "密钥验收", goal: "", tasks: [{ title: "练习", subject: "数学", scheduledDate: "2026-10-25", estimatedMinutes: 25 }] }) } }] }
        : { content: "受控回答" };
      return Response.json({ choices: [{ message }] });
    };
    await Promise.all([propose(a, "测试个人计划"), sendMessage(b, { message: "测试个人聊天" })]);
    assert.deepEqual(seen.sort(), ["Bearer test-key-alice", "Bearer test-key-bob"]);
    assert.equal(await db.task.count({ where: { userId: a } }), 0, "提议仍需用户批准");
    await removeModelSettings(a);
    assert.equal((await userModelStatus(a)).configured, false);
    await assert.rejects(userChatModel(a), /自己的 API Key/);
    await assert.rejects(propose(a, "移除后不能调用"), /自己的 API Key/);
    await assert.rejects(sendMessage(a, { message: "移除后不能调用" }), /自己的 API Key/);
    assert.equal((await userModelStatus(b)).configured, true);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.MODEL_ENCRYPTION_KEY; else process.env.MODEL_ENCRYPTION_KEY = previousKey;
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  }
});
