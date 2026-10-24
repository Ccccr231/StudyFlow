"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, Check, RotateCcw, Headphones, Circle } from "lucide-react";
import { SpringButton as Button } from "@/components/spring-button";
import type { Dashboard } from "./types";
export function FocusTimer({ data, mutate, busy, selectedTask = "", onActive }: { data: Dashboard; mutate: (url: string, method: string, value: unknown) => Promise<boolean>; busy: boolean; selectedTask?: string; onActive?: () => void }) {
  const [minutes, setMinutes] = useState(25);
  const [taskId, setTaskId] = useState("");
  const [now, setNow] = useState(0);
  const anchor = useRef({ monotonic: 0, server: 0 });
  const session = data.activeFocus;
  useEffect(() => { if (selectedTask) setTaskId(selectedTask); }, [selectedTask]);
  useEffect(() => { anchor.current = { monotonic: performance.now(), server: Date.parse(data.serverNow) }; setNow(Date.parse(data.serverNow)); }, [data.serverNow]);
  useEffect(() => { const interval = setInterval(() => setNow(anchor.current.server + performance.now() - anchor.current.monotonic), 500); return () => clearInterval(interval); }, []);
  useEffect(() => { const handler = (event: Event) => { const id = (event as CustomEvent<string>).detail; setTaskId(id); onActive?.(); }; window.addEventListener("studyflow:focus-task", handler); return () => window.removeEventListener("studyflow:focus-task", handler); }, [onActive]);
  const elapsed = session ? Math.min(session.plannedSeconds, session.elapsedSeconds + (session.status === "RUNNING" && session.lastResumedAt ? Math.max(0, (now - Date.parse(session.lastResumedAt)) / 1000) : 0)) : 0;
  const remaining = Math.max(0, Math.ceil((session?.plannedSeconds ?? minutes * 60) - elapsed));
  const progress = session ? elapsed / session.plannedSeconds : 0;
  const timerText = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  const action = async (action: string) => { if (session) await mutate("/api/focus", "PATCH", { id: session.id, version: session.version, action }); };
  const linked = data.tasks.find(t => t.id === session?.taskId);
  return <section className={`focus-card panel ${session?.status === "RUNNING" ? "is-focusing" : ""}`} id="focus-timer" aria-labelledby="focus-heading"><div className="panel-heading"><div><span className="eyebrow">A LITTLE MORE PRESENT</span><h2 id="focus-heading">把此刻，留给专注。</h2></div><Headphones size={19} /></div><div className="timer-mode"><span className="live-dot" />{session ? session.status === "PAUSED" ? "暂歇片刻" : remaining === 0 ? "本轮已到时 · 请打卡" : "正在专注" : "准备好，就开始吧"}</div><div className="timer-dial"><svg viewBox="0 0 240 240" aria-hidden="true"><circle cx="120" cy="120" r="108" className="dial-track" /><circle cx="120" cy="120" r="108" className="dial-progress" pathLength="100" strokeDasharray={`${progress * 100} 100`} /></svg><div><span className="timer-value" role="timer" aria-label={`剩余 ${timerText}`}>{timerText}</span><p>{session ? linked?.title || "自由专注" : "一次只做一件事"}</p></div></div>
    {!session && <><div className="duration-options">{[15, 25, 45].map(m => <button key={m} aria-pressed={m === minutes} onClick={() => setMinutes(m)}>{m} 分钟</button>)}<label className="custom-duration"><input aria-label="自定义专注分钟" type="number" min={1} max={180} value={minutes} onChange={e => setMinutes(Number(e.target.value))} /><span>分钟</span></label></div><label className="select-label">关联学习任务<select aria-label="关联学习任务" value={taskId} onChange={e => setTaskId(e.target.value)}><option value="">自由专注，不关联任务</option>{data.tasks.filter(t => !t.completed).map(t => <option value={t.id} key={t.id}>{t.title}</option>)}</select></label></>}
    <div className="timer-actions">{!session ? <Button disabled={busy || minutes < 1 || minutes > 180 || !Number.isInteger(minutes)} onClick={() => mutate("/api/focus", "POST", { minutes, ...(taskId ? { taskId } : {}) })}><Play size={16} fill="currentColor" />开始专注</Button> : <><Button variant="outline" disabled={busy || remaining === 0} onClick={() => action(session.status === "PAUSED" ? "resume" : "pause")}>{session.status === "PAUSED" ? <Play size={16} /> : <Pause size={16} />}{session.status === "PAUSED" ? "继续" : "暂停"}</Button><Button disabled={busy} onClick={() => action("finish")}><Check size={16} />{remaining === 0 ? "完成打卡" : "结束并打卡"}</Button></>}</div>
    {session ? <button className="text-button cancel-focus" disabled={busy} onClick={() => { if (window.confirm("放弃本轮专注？已用时间保留在历史中，但不计入已打卡统计。")) void action("cancel"); }}><RotateCcw size={13} />放弃本轮</button> : <p className="timer-note"><Circle size={9} />时间从真实开始的那一刻记录</p>}
  </section>;
}
