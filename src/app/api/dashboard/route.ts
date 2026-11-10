import { api } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/modules/identity/service";
import { aggregate } from "@/modules/analytics/service";
import { userModelStatus } from "@/modules/agent/settings";
export async function GET() {
  return api(async () => {
    const user = await requireUser();
    const model = await userModelStatus(user.id);
    return db.$transaction(async tx => {
      const tasks = await tx.task.findMany({ where: { userId: user.id }, orderBy: [{ scheduledDate: "asc" }, { createdAt: "asc" }] });
      const plans = await tx.plan.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
      const focus = await tx.focusSession.findMany({ where: { userId: user.id }, orderBy: { startedAt: "desc" } });
      const agentRuns = await tx.agentRun.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 });
      return { user, tasks, plans, activeFocus: focus.find(f => f.activeKey === user.id) ?? null, focus: focus.slice(0, 30), stats: aggregate(focus, tasks), agentRuns, model, serverNow: new Date().toISOString() };
    });
  });
}
