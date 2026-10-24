import { z } from "zod";
import { db } from "@/lib/db";
import { assert } from "@/lib/api";

export const materialInput = z.object({
  title: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(30),
  text: z.string().trim().min(20).max(16000),
}).strict();

export function splitMaterial(text: string) {
  const paragraphs = text.replace(/\r\n?/g, "\n").split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  return paragraphs.flatMap((paragraph, index) => {
    const parts = [];
    for (let offset = 0; offset < paragraph.length; offset += 800) {
      parts.push({ position: 0, locator: `第 ${index + 1} 段${paragraph.length > 900 ? ` · 字符 ${offset + 1}–${Math.min(offset + 900, paragraph.length)}` : ""}`, text: paragraph.slice(offset, offset + 900) });
      if (offset + 900 >= paragraph.length) break;
    }
    return parts;
  }).map((chunk, position) => ({ ...chunk, position }));
}

function terms(text: string) {
  const normalized = text.normalize("NFKC").toLowerCase();
  const words = normalized.match(/[a-z0-9_]{2,}|\p{Script=Han}+/gu) ?? [];
  return [...new Set(words.flatMap(word => /^\p{Script=Han}/u.test(word)
    ? word.length < 2 ? [word] : Array.from({ length: word.length - 1 }, (_, i) => word.slice(i, i + 2))
    : [word]))].slice(0, 80);
}

export function rankChunks<T extends { text: string; title: string; subject: string }>(query: string, chunks: T[]) {
  const keys = terms(query);
  const normalized = chunks.map(c => `${c.title} ${c.subject} ${c.text}`.normalize("NFKC").toLowerCase());
  const frequencies = keys.map(key => normalized.filter(t => t.includes(key)).length);
  // ponytail: 有上限的本地词项检索；资料规模扩大后用独立召回集评估混合/向量检索。
  return chunks.map((chunk, index) => ({ ...chunk, score: keys.reduce((score, key, i) =>
    score + (normalized[index].includes(key) ? Math.log(1 + chunks.length / (1 + frequencies[i])) : 0), 0) }))
    .filter(c => c.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
}

export async function listMaterials(userId: string) {
  return db.studyMaterial.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, include: { _count: { select: { chunks: true } } } });
}

export async function addMaterial(userId: string, input: z.infer<typeof materialInput>) {
  const value = materialInput.parse(input);
  return db.$transaction(async tx => {
    assert(await tx.studyMaterial.count({ where: { userId } }) < 30, 400, "每个账号最多保存 30 份资料，请先删除不用的资料");
    return tx.studyMaterial.create({ data: { userId, title: value.title, subject: value.subject, chunks: { create: splitMaterial(value.text) } } });
  });
}

export async function readMaterial(userId: string, id: string) {
  const material = await db.studyMaterial.findFirst({ where: { id, userId }, include: { chunks: { orderBy: { position: "asc" } } } });
  assert(material, 404, "资料不存在");
  return material;
}

export async function deleteMaterial(userId: string, id: string) {
  const result = await db.studyMaterial.deleteMany({ where: { id, userId } });
  assert(result.count, 404, "资料不存在");
  return { deleted: true };
}

export async function searchMaterials(userId: string, query: string) {
  const chunks = await db.materialChunk.findMany({ where: { material: { userId } }, include: { material: { select: { title: true, subject: true } } }, orderBy: [{ materialId: "asc" }, { position: "asc" }] });
  return rankChunks(query, chunks.map(c => ({ id: c.id, materialId: c.materialId, title: c.material.title, subject: c.material.subject, locator: c.locator, text: c.text })));
}
