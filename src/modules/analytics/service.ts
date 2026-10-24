import type { Segment } from "@/modules/focus/clock";
export function localDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
export function shiftDate(day: string, offset: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + offset * 86400000).toISOString().slice(0, 10);
}
export function weekDates(today = localDate()) {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  const monday = shiftDate(today, -((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => shiftDate(monday, i));
}
export function aggregate(focus: { status: string; segments: unknown }[], tasks: { completed: boolean; scheduledDate: string }[], today = localDate()) {
  const seconds: Record<string, number> = {};
  for (const record of focus) {
    if (record.status !== "COMPLETED") continue;
    for (const segment of record.segments as Segment[]) {
      let start = Date.parse(segment.start);
      const end = Date.parse(segment.end);
      while (start < end) {
        const day = localDate(new Date(start));
        const boundary = Date.parse(`${shiftDate(day, 1)}T00:00:00+08:00`);
        const next = Math.min(end, boundary);
        seconds[day] = (seconds[day] ?? 0) + (next - start) / 1000;
        start = next;
      }
    }
  }
  const dates = weekDates(today);
  const week = dates.map((date, index) => ({ date, label: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"][index], minutes: Math.round((seconds[date] ?? 0) / 6) / 10 }));
  const todayTasks = tasks.filter(t => t.scheduledDate === today);
  return { today, todaySeconds: seconds[today] ?? 0, weekSeconds: dates.reduce((s, d) => s + (seconds[d] ?? 0), 0), week, totalTasks: tasks.length, completedTasks: tasks.filter(t => t.completed).length, todayTotal: todayTasks.length, todayCompleted: todayTasks.filter(t => t.completed).length, sessions: focus.filter(s => s.status === "COMPLETED").length };
}
