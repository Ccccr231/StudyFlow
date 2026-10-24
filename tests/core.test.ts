import { test } from "node:test";
import assert from "node:assert/strict";
import { elapsed, closeSegment } from "../src/modules/focus/clock";
import { aggregate, weekDates } from "../src/modules/analytics/service";
import { hashPassword, verifyPassword } from "../src/modules/identity/service";
test("密码使用随机盐且可以验证", async () => {
  const a = await hashPassword("studyflow-test-password");
  const b = await hashPassword("studyflow-test-password");
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("studyflow-test-password", a), true);
  assert.equal(await verifyPassword("incorrect-password", a), false);
});
test("番茄钟累计实际时间，封顶，暂停不累计，时钟回退不扣时", () => {
  const start = new Date("2026-10-18T10:00:00Z");
  const clock = { status: "RUNNING", plannedSeconds: 60, elapsedSeconds: 20, lastResumedAt: start };
  assert.equal(elapsed(clock, new Date("2026-10-18T10:00:10Z")), 30);
  assert.equal(elapsed(clock, new Date("2026-10-18T11:00:00Z")), 60);
  assert.equal(elapsed({ ...clock, status: "PAUSED" }, new Date("2026-10-18T11:00:00Z")), 20);
  assert.equal(elapsed(clock, new Date("2026-10-18T09:59:59Z")), 20);
  const segments = closeSegment(clock, [], new Date("2026-10-18T11:00:00Z"));
  assert.equal(segments[0].end, "2026-10-18T10:00:40.000Z");
});
test("统计拆分上海跨日片段，只计已打卡记录，周从周一开始", () => {
  const segments = [{ start: "2026-10-18T15:59:30Z", end: "2026-10-18T16:00:30Z" }];
  const focus = [{ status: "COMPLETED", segments }, { status: "CANCELLED", segments }];
  const a = aggregate(focus, [], "2026-10-18");
  const b = aggregate(focus, [], "2026-10-19");
  assert.equal(a.todaySeconds, 30);
  assert.equal(b.todaySeconds, 30);
  assert.equal(a.weekSeconds, 30);
  assert.equal(a.sessions, 1);
  assert.deepEqual(weekDates("2026-10-18"), ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"]);
});
