"use client";
import { useState } from "react";
import { ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
import { SpringButton as Button } from "@/components/spring-button";
import { Input } from "@/components/ui/input";
import { request } from "./types";
export function Auth({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [register, setRegister] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <main className="auth-screen"><button className="text-button auth-back" onClick={onBack}><ArrowLeft size={16} /> 返回校园</button><div className="auth-art"><div className="auth-character" /><p>海纳百川，自强不息。<span>让每一小步，都算数。</span></p></div><section className="auth-panel"><span className="eyebrow">YOUR OWN LITTLE SPACE</span><h1>{register ? "很高兴，与你一起出发。" : "欢迎回到你的学习空间。"}</h1><p>用本地账号保存每一次专注，所有数据留在这台服务器。</p><div className="auth-switch"><button aria-pressed={register} onClick={() => { setRegister(true); setError(""); }}>创建账号</button><button aria-pressed={!register} onClick={() => { setRegister(false); setError(""); }}>登录账号</button></div><form onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError("");
    const form = new FormData(e.currentTarget);
    try { await request(`/api/auth/${register ? "register" : "login"}`, "POST", { username: form.get("username"), password: form.get("password"), ...(register ? { name: form.get("name") } : {}) }); onDone(); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }}>
    {register && <label>怎么称呼你<Input name="name" autoComplete="nickname" maxLength={30} required placeholder="你的名字" /></label>}
    <label>账号<Input name="username" autoComplete="username" pattern="[a-zA-Z0-9_]{3,32}" minLength={3} maxLength={32} required placeholder="3–32 位字母、数字或下划线" /></label>
    <label>密码<Input name="password" autoComplete={register ? "new-password" : "current-password"} type="password" minLength={10} maxLength={128} required placeholder="至少 10 位" aria-describedby="auth-password-hint" /><small id="auth-password-hint" className="auth-password-hint">密码需为 10–128 位。</small></label>
    {error && <p className="inline-error" role="alert">{error}</p>}
    <Button className="auth-submit" type="submit" disabled={busy}>{busy ? "正在进入…" : register ? "创建我的学习空间" : "进入学习空间"}<ArrowRight size={16} /></Button>
  </form><p className="auth-privacy"><ShieldCheck size={15} /> 无第三方登录，无邮箱验证。只属于你的学习空间。</p></section></main>;
}
