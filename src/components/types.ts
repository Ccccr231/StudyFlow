export type Task = { id: string; planId: string | null; title: string; subject: string; scheduledDate: string; estimatedMinutes: number; completed: boolean };
export type Plan = { id: string; title: string; goal: string };
export type Focus = { id: string; taskId: string | null; plannedSeconds: number; elapsedSeconds: number; lastResumedAt: string | null; status: string; version: number; startedAt: string; endedAt: string | null };
export type AgentRun = { id: string; prompt: string; status: string; analysis: string; proposal: import("@/modules/agent/provider").Proposal; createdAt: string };
export type Dashboard = {
  user: { name: string; username: string; id: string }; tasks: Task[]; plans: Plan[]; focus: Focus[]; activeFocus: Focus | null; agentRuns: AgentRun[]; serverNow: string;
  model: { configured: boolean; name: string; kind: string; provider?: string };
  stats: { today: string; todaySeconds: number; weekSeconds: number; totalTasks: number; completedTasks: number; todayTotal: number; todayCompleted: number; sessions: number; week: { date: string; label: string; minutes: number }[] };
};
export async function request<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : {}, ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "请求失败，请重试");
  return result.data;
}
