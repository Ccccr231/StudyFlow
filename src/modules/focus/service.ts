import { z } from "zod";
import { db } from "@/lib/db";
import { assert } from "@/lib/api";
import { elapsed, closeSegment, type Segment } from "./clock";
export const focusStart = z.object({ minutes: z.number().int().min(1).max(180), taskId: z.string().optional() });
export const focusAction = z.object({ id: z.string(), action: z.enum(["pause", "resume", "finish", "cancel"]), version: z.number().int().min(0) });
export async function startFocus(userId: string, input: z.infer<typeof focusStart>) {
  return db.$transaction(async tx => {
    if (input.taskId) assert(await tx.task.findFirst({ where: { id: input.taskId, userId } }), 404, "关联任务不存在");
    assert(!await tx.focusSession.findUnique({ where: { activeKey: userId } }), 409, "请先结束当前专注");
    const session = await tx.focusSession.create({ data: { userId, taskId: input.taskId, activeKey: userId, plannedSeconds: input.minutes * 60, segments: [], lastResumedAt: new Date() } });
    await tx.user.update({ where: { id: userId }, data: { revision: { increment: 1 } } });
    return session;
  });
}
export async function actFocus(userId: string, input: z.infer<typeof focusAction>) {
  return db.$transaction(async tx => {
    const session = await tx.focusSession.findFirst({ where: { id: input.id, userId } });
    assert(session, 404, "专注记录不存在");
    assert(session.activeKey && session.version === input.version, 409, "专注状态已变化，请刷新");
    assert((input.action !== "pause" || session.status === "RUNNING") && (input.action !== "resume" || session.status === "PAUSED"), 409, "当前状态不允许此操作");
    const now = new Date();
    const seconds = elapsed(session, now);
    if (input.action === "resume") assert(seconds < session.plannedSeconds, 409, "计时已结束，请打卡保存");
    const terminal = input.action === "finish" || input.action === "cancel";
    const result = await tx.focusSession.updateMany({ where: { id: session.id, userId, version: input.version, activeKey: userId }, data: {
      status: input.action === "finish" ? "COMPLETED" : input.action === "cancel" ? "CANCELLED" : input.action === "pause" ? "PAUSED" : "RUNNING",
      activeKey: terminal ? null : userId,
      elapsedSeconds: seconds,
      lastResumedAt: input.action === "resume" ? now : null,
      segments: closeSegment(session, session.segments as Segment[], now),
      endedAt: terminal ? now : null,
      version: { increment: 1 }
    } });
    assert(result.count, 409, "专注状态已变化，请刷新");
    await tx.user.update({ where: { id: userId }, data: { revision: { increment: 1 } } });
    return tx.focusSession.findFirst({ where: { id: session.id, userId } });
  });
}
