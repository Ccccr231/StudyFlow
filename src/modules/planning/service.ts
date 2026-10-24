import { z } from "zod";
import { db } from "@/lib/db";
import { assert } from "@/lib/api";
export const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => {
  const date = new Date(`${s}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === s;
});
export const taskFields = z.object({
  title: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(30).default("自主学习"),
  scheduledDate: dateString,
  estimatedMinutes: z.number().int().min(1).max(480).default(25)
});
export const newTask = taskFields.extend({ planId: z.string().min(1).optional() });
export const taskUpdate = taskFields.partial().extend({ completed: z.boolean().optional() }).strict();
export const newPlan = z.object({ title: z.string().trim().min(1).max(120), goal: z.string().trim().max(1000).default("") });
export async function createTask(userId: string, input: z.infer<typeof newTask>) {
  return db.$transaction(async tx => {
    if (input.planId) assert(await tx.plan.findFirst({ where: { id: input.planId, userId } }), 404, "计划不存在");
    const task = await tx.task.create({ data: { ...input, userId } });
    await tx.user.update({ where: { id: userId }, data: { revision: { increment: 1 } } });
    return task;
  });
}
export async function updateTask(userId: string, id: string, input: z.infer<typeof taskUpdate>) {
  return db.$transaction(async tx => {
    const result = await tx.task.updateMany({ where: { id, userId }, data: input });
    assert(result.count, 404, "任务不存在");
    await tx.user.update({ where: { id: userId }, data: { revision: { increment: 1 } } });
    return tx.task.findFirst({ where: { id, userId } });
  });
}
export async function createPlan(userId: string, input: z.infer<typeof newPlan>) {
  return db.$transaction(async tx => {
    const plan = await tx.plan.create({ data: { ...input, userId } });
    await tx.user.update({ where: { id: userId }, data: { revision: { increment: 1 } } });
    return plan;
  });
}
