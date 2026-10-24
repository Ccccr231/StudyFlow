export type Segment = { start: string; end: string };
export type Clock = { status: string; plannedSeconds: number; elapsedSeconds: number; lastResumedAt: Date | null };
export function elapsed(clock: Clock, now = new Date()) {
  const delta = clock.status === "RUNNING" && clock.lastResumedAt ? Math.max(0, (now.getTime() - clock.lastResumedAt.getTime()) / 1000) : 0;
  return Math.min(clock.plannedSeconds, clock.elapsedSeconds + delta);
}
export function closeSegment(clock: Clock, segments: Segment[], now = new Date()) {
  if (clock.status !== "RUNNING" || !clock.lastResumedAt) return segments;
  const seconds = elapsed(clock, now) - clock.elapsedSeconds;
  if (seconds <= 0) return segments;
  return [...segments, { start: clock.lastResumedAt.toISOString(), end: new Date(clock.lastResumedAt.getTime() + seconds * 1000).toISOString() }];
}
