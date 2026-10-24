import { db } from "@/lib/db";
import { assert, ApiError } from "@/lib/api";
import { aggregate } from "@/modules/analytics/service";
import { CompatibleModel, proposalSchema, type ModelProvider } from "./provider";
export async function observe(userId: string) {
  return db.$transaction(async tx => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { revision: true } });
    const tasks = await tx.task.findMany({ where: { userId }, orderBy: { scheduledDate: "asc" } });
    const plans = await tx.plan.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    const focus = await tx.focusSession.findMany({ where: { userId }, orderBy: { startedAt: "desc" } });
    const stats = aggregate(focus, tasks);
    return { revision: user.revision, today: stats.today, tasks, plans, stats, focus: focus.slice(0, 100).map(f => ({ taskId: f.taskId, status: f.status, elapsedSeconds: f.elapsedSeconds, startedAt: f.startedAt })) };
  });
}
export async function propose(userId: string, prompt: string, provider: ModelProvider = new CompatibleModel()) {
  const snapshot = await observe(userId);
  const summary = `共 ${snapshot.stats.totalTasks} 项任务，已完成 ${snapshot.stats.completedTasks} 项；今日已打卡专注 ${Math.round(snapshot.stats.todaySeconds / 60)} 分钟，本周 ${Math.round(snapshot.stats.weekSeconds / 60)} 分钟。`;
  const result = await provider.propose({ prompt, snapshot, analysis: summary });
  return storeProposal(userId, prompt, result, snapshot);
}
export async function storeProposal(userId: string, prompt: string, result: { analysis: string; proposal: unknown }, snapshot: Awaited<ReturnType<typeof observe>>) {
  const proposal = proposalSchema.parse(result.proposal);
  const ids = new Set(snapshot.tasks.map(t => t.id));
  for (const call of proposal) if (call.name === "update_tasks") for (const change of call.arguments.changes) assert(ids.has(change.id), 502, "模型引用了不存在的任务，提议已拒绝");
  return db.agentRun.create({ data: { userId, prompt, observedRevision: snapshot.revision, analysis: result.analysis, proposal } });
}
export async function decide(userId: string, id: string, approve: boolean) {
  try {
    return await db.$transaction(async tx => {
      const run = await tx.agentRun.findFirst({ where: { id, userId } });
      assert(run, 404, "提议不存在");
      assert(run.status === "PENDING", 409, "此提议已处理");
      if (approve) assert(Date.now() - run.createdAt.getTime() < 86400000, 409, "提议已过期，请重新分析");
      const updated = await tx.agentRun.updateMany({ where: { id, userId, status: "PENDING" }, data: { status: approve ? "APPLIED" : "REJECTED", appliedAt: new Date() } });
      assert(updated.count === 1, 409, "此提议已处理");
      if (!approve) return { status: "REJECTED" };
      const lock = await tx.user.updateMany({ where: { id: userId, revision: run.observedRevision }, data: { revision: { increment: 1 } } });
      assert(lock.count === 1, 409, "学习数据已变化，请拒绝旧提议后重新分析");
      const calls = proposalSchema.parse(run.proposal);
      for (const call of calls) {
        if (call.name === "create_plan") {
          const { title, goal, tasks } = call.arguments;
          const plan = await tx.plan.create({ data: { userId, title, goal } });
          for (const task of tasks) await tx.task.create({ data: { ...task, userId, planId: plan.id } });
        } else {
          for (const { id: taskId, ...change } of call.arguments.changes) {
            const task = await tx.task.findFirst({ where: { id: taskId, userId, completed: false } });
            assert(task, 409, "任务不存在、已完成或不属于当前账号，未执行任何修改");
            await tx.task.update({ where: { id: task.id }, data: change });
          }
        }
      }
      return { status: "APPLIED" };
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2034") throw new ApiError(409, "数据正被其他操作修改，请重试");
    throw error;
  }
}
