import { NextResponse } from "next/server";
import { z } from "zod";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function assert(value: unknown, status: number, message: string): asserts value {
  if (!value) throw new ApiError(status, message);
}
export async function body<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const contentLength = Number(request.headers.get("content-length") || 0);
  assert(contentLength <= 65536, 413, "请求内容过大");
  const reader = request.body?.getReader();
  assert(reader, 400, "请求内容不能为空");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 65536) { await reader.cancel(); throw new ApiError(413, "请求内容过大"); }
    chunks.push(value);
  }
  try { return schema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
  catch { throw new ApiError(400, "输入格式不正确，请检查字段和范围"); }
}
export function sameOrigin(request: Request) {
  const expected = new URL(process.env.APP_ORIGIN || "http://localhost:3000");
  const allowed = new Set([expected.origin]);
  // 本机的两个常用入口等价，协议和端口仍须与配置一致。
  if (expected.hostname === "localhost" || expected.hostname === "127.0.0.1") {
    const alias = new URL(expected);
    alias.hostname = expected.hostname === "localhost" ? "127.0.0.1" : "localhost";
    allowed.add(alias.origin);
  }
  assert(allowed.has(request.headers.get("origin") || ""), 403, "请求来源不被允许");
}

// ponytail: 单进程限流；多副本部署时替换为 Redis 原子计数。
const attempts = new Map<string, { count: number; expires: number }>();
export function rateLimit(key: string, max: number, windowMs = 60000) {
  const now = Date.now();
  for (const [k, v] of attempts) if (v.expires <= now) attempts.delete(k);
  const entry = attempts.get(key) ?? { count: 0, expires: now + windowMs };
  assert(entry.count < max, 429, "操作太频繁，请稍后重试");
  entry.count++;
  attempts.set(key, entry);
}
export async function api(fn: () => Promise<unknown>) {
  try { return NextResponse.json({ data: await fn() }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    const code = (error as { code?: string }).code;
    if (code === "P2002" || code === "P2034" || code === "P1008") return NextResponse.json({ error: "操作冲突，请刷新后重试" }, { status: 409 });
    console.error("StudyFlow request failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "服务暂时不可用，请稍后重试" }, { status: 500 });
  }
}
