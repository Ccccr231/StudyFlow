import { api, assert, body, rateLimit, sameOrigin } from "@/lib/api";
import { db } from "@/lib/db";
import { credentials, hashPassword, verifyPassword, newSession, logout, currentUser } from "@/modules/identity/service";
export const runtime = "nodejs";
export async function GET() { return api(async () => currentUser()); }
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  return api(async () => {
    sameOrigin(request);
    const { action } = await context.params;
    if (action === "logout") { await logout(); return { ok: true }; }
    assert(action === "login" || action === "register", 404, "接口不存在");
    // 不信任客户端 X-Forwarded-For；内网单进程全局上限 + 账号上限。
    rateLimit("auth:global", 60);
    const input = await body(request, credentials);
    rateLimit(`auth:${input.username}`, 10, 300000);
    if (action === "register") {
      assert(!await db.user.findUnique({ where: { username: input.username } }), 409, "此账号已被使用");
      const user = await db.user.create({ data: { username: input.username, name: input.name || input.username, passwordHash: await hashPassword(input.password) } });
      await newSession(user.id);
      return { id: user.id, name: user.name, username: user.username };
    }
    const user = await db.user.findUnique({ where: { username: input.username } });
    // 用户不存在也执行 scrypt，减少账号存在性时间差。
    const encoded = user?.passwordHash ?? `00000000000000000000000000000000:${"00".repeat(64)}`;
    const valid = await verifyPassword(input.password, encoded);
    assert(user && valid, 401, "账号或密码不正确");
    await newSession(user.id);
    return { id: user.id, name: user.name, username: user.username };
  });
}
