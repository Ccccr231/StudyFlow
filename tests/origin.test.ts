import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError, sameOrigin } from "../src/lib/api";

test("本地来源允许 localhost 与 127.0.0.1，仍拒绝外站、错误端口和缺失来源", () => {
  const previous = process.env.APP_ORIGIN;
  const check = (origin?: string) => sameOrigin(new Request("http://127.0.0.1:3000/api/auth/register", { method: "POST", headers: origin ? { Origin: origin } : {} }));
  const forbidden = (origin?: string) => assert.throws(() => check(origin), error => error instanceof ApiError && error.status === 403);
  try {
    for (const configured of ["http://localhost:3000", "http://127.0.0.1:3000"]) {
      process.env.APP_ORIGIN = configured;
      assert.doesNotThrow(() => check("http://localhost:3000"));
      assert.doesNotThrow(() => check("http://127.0.0.1:3000"));
      for (const origin of [undefined, "null", "http://evil.invalid", "http://localhost.evil.invalid:3000", "http://127.0.0.1.evil.invalid:3000", "http://localhost:3001", "http://127.0.0.1:3001", "https://localhost:3000"]) forbidden(origin);
    }
    process.env.APP_ORIGIN = "https://study.example";
    assert.doesNotThrow(() => check("https://study.example"));
    forbidden("http://localhost:3000");
    forbidden("http://127.0.0.1:3000");
    forbidden("http://study.example");
  } finally {
    if (previous === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = previous;
  }
});
