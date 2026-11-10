import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, assert } from "@/lib/api";

// ponytail: fixed provider endpoints prevent user-controlled URLs from reaching the server's private network.
export const providers = {
  deepseek: { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-flash" },
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini" },
};
export const modelSettingsInput = z.object({
  provider: z.enum(["deepseek", "openai"]),
  model: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9._:/-]+$/),
  apiKey: z.string().trim().min(8).max(512).regex(/^[\x21-\x7e]+$/),
}).strict();
export type ModelConfig = { baseUrl: string; model: string; apiKey: string };

function encryptionKey() {
  const key = process.env.MODEL_ENCRYPTION_KEY;
  assert(key && /^[a-fA-F0-9]{64}$/.test(key), 503, "密钥存储尚未就绪，请联系管理员配置加密密钥");
  return Buffer.from(key, "hex");
}
export function encryptApiKey(userId: string, value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(userId));
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString("base64url")).join(".");
}
export function decryptApiKey(userId: string, value: string) {
  const key = encryptionKey();
  try {
    const [iv, tag, encrypted] = value.split(".").map(part => Buffer.from(part, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(Buffer.from(userId));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch { throw new ApiError(503, "保存的密钥无法解密，请重新保存 API Key"); }
}
export async function userModelStatus(userId: string) {
  const settings = await db.userModelSetting.findUnique({ where: { userId }, select: { provider: true, model: true } });
  return { configured: Boolean(settings), name: settings?.model || "未连接模型", kind: "个人 API Key", provider: settings?.provider || "deepseek" };
}
export async function saveModelSettings(userId: string, input: z.input<typeof modelSettingsInput>) {
  const value = modelSettingsInput.parse(input);
  const data = { provider: value.provider, model: value.model, encryptedApiKey: encryptApiKey(userId, value.apiKey) };
  await db.userModelSetting.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  return userModelStatus(userId);
}
export async function removeModelSettings(userId: string) {
  await db.userModelSetting.deleteMany({ where: { userId } });
  return userModelStatus(userId);
}
export async function userModelConfig(userId: string): Promise<ModelConfig> {
  const settings = await db.userModelSetting.findUnique({ where: { userId } });
  assert(settings, 503, "尚未连接模型，请到空间设置填写你自己的 API Key");
  const provider = providers[settings.provider as keyof typeof providers];
  assert(provider, 503, "模型服务配置无效，请重新保存");
  return { baseUrl: provider.baseUrl, model: settings.model, apiKey: decryptApiKey(userId, settings.encryptedApiKey) };
}
