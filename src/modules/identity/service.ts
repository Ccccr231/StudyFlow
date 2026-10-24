import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { assert } from "@/lib/api";
const scrypt = promisify(scryptCallback);
const COOKIE = "studyflow_session";
export const credentials = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,32}$/),
  password: z.string().min(10).max(128),
  name: z.string().trim().min(1).max(30).optional()
});
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [salt, hash] = encoded.split(":");
  const key = await scrypt(password, salt, 64) as Buffer;
  const stored = Buffer.from(hash, "hex");
  return stored.length === key.length && timingSafeEqual(stored, key);
}
const digest = (token: string) => createHash("sha256").update(token).digest("hex");
export async function newSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await db.session.create({ data: { userId, tokenHash: digest(token), expiresAt } });
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.COOKIE_SECURE === "true", expires: expiresAt, path: "/" });
}
export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: digest(token) }, include: { user: true } });
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  return { id: session.user.id, username: session.user.username, name: session.user.name };
}
export async function requireUser() {
  const user = await currentUser();
  assert(user, 401, "请先登录你的本地账号");
  return user;
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: digest(token) } });
  jar.delete(COOKIE);
}
