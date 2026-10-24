"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Plus, Send, Trash2, FileText, MessageCircle } from "lucide-react";
import { SpringButton as Button } from "./spring-button";
import { request } from "./types";
import type { AgentHome, Conversation, Material, MaterialSource } from "@/modules/student-agent/types";

export function StudentAgent({ configured, modelName, onRefresh, readOnly = false }: {
  configured: boolean; modelName: string; onRefresh: () => Promise<unknown>; readOnly?: boolean;
}) {
  const [home, setHome] = useState<AgentHome | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState("");
  const [allowMaterials, setAllowMaterials] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [reading, setReading] = useState<{ id: string; title: string; chunks: { locator: string; text: string }[] } | null>(null);
  const [pane, setPane] = useState<"chat" | "materials">("chat");
  const latestLoad = useRef(0);
  const messageList = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const reload = useCallback(async () => {
    const [h, m] = await Promise.all([request<AgentHome>("/api/student-agent"), request<Material[]>("/api/materials")]);
    setHome(h); setMaterials(m);
  }, []);

  useEffect(() => {
    if (readOnly) { setLoading(false); return; }
    let live = true;
    void Promise.all([request<AgentHome>("/api/student-agent"), request<Material[]>("/api/materials")]).then(async ([h, m]) => {
      const recent = h.conversations[0];
      const c = recent ? await request<Conversation>(`/api/student-agent?id=${encodeURIComponent(recent.id)}`) : null;
      if (live) { setHome(h); setMaterials(m); setConversation(c); }
    }).catch(e => { if (live) setError((e as Error).message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [readOnly]);

  useEffect(() => { if (pane === "chat" && messageList.current) messageList.current.scrollTop = messageList.current.scrollHeight; }, [conversation?.messages.length, pane]);

  async function openConversation(id: string) {
    const token = ++latestLoad.current;
    setLoading(true); setError("");
    try { const c = await request<Conversation>(`/api/student-agent?id=${encodeURIComponent(id)}`); if (token === latestLoad.current) { setConversation(c); setPane("chat"); setDraft(""); } }
    catch (e) { if (token === latestLoad.current) setError((e as Error).message); }
    finally { if (token === latestLoad.current) setLoading(false); }
  }

  async function send() {
    if (busy || loading || !draft.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await request<{ conversation: Conversation; failed: boolean }>("/api/student-agent", "POST", { conversationId: conversation?.id, message: draft.trim(), allowMaterials });
      setConversation(result.conversation); setDraft("");
      if (result.failed) setError("本轮未完成，具体原因已保存在会话中。你可以继续发送，或先检查模型连接。");
      await reload();
      await onRefresh();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); textarea.current?.focus(); }
  }

  async function remove(kind: "conversation" | "observation", id: string) {
    if (!window.confirm(kind === "conversation" ? "删除此会话及其学习观察？已生成的计划提议仍保留在提议列表。" : "删除这条待验证观察？")) return;
    setBusy(true); setError("");
    try {
      await request("/api/student-agent", "DELETE", { kind, id });
      if (kind === "conversation" && conversation?.id === id) setConversation(null);
      await reload();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  function sources(items: MaterialSource[]) {
    return items.map(source => <details className="sa-source" key={source.id}><summary><BookOpen size={14} aria-hidden="true" />{source.title} · {source.locator}</summary><p>{source.text}</p></details>);
  }

  if (readOnly) return <section className="panel"><h2>学习与生活 Agent</h2><p>这是界面预览。登录真实账号后，可导入资料、继续会话并审阅行动提议。</p></section>;

  return <section className="student-agent" aria-label="学习与生活 Agent">
    <header className="sa-header panel"><div><span className="eyebrow">STUDY & EVERYDAY LIFE</span><h2>学会一门课，也安排好每一天。</h2><p>把课程资料交给林连理，一起讲解、追问和复盘；学习与生活待办，确认后再安排。</p></div><span className="sa-model">{configured ? `${modelName} · 已配置` : "模型未配置"}</span></header>
    <div className="sa-tabs" role="group" aria-label="Agent 工作区"><button aria-pressed={pane === "chat"} onClick={() => setPane("chat")}><MessageCircle size={16} aria-hidden="true" />学习与生活</button><button aria-pressed={pane === "materials"} onClick={() => setPane("materials")}><BookOpen size={16} aria-hidden="true" />我的课程资料 · {materials.length}</button></div>
    {error && <p className="sa-alert" role="alert">{error}{!home && !busy && <button onClick={() => { setError(""); void reload().catch(e => setError(e.message)); }}>重新加载</button>}</p>}
    {notice && <p className="sa-notice" role="status">{notice}</p>}
    {pane === "chat" ? <div className="sa-workspace">
      <aside className="sa-sidebar panel" aria-label="会话和学习观察"><Button variant="outline" disabled={busy || loading} onClick={() => { ++latestLoad.current; setConversation(null); setDraft(""); setError(""); textarea.current?.focus(); }}><Plus size={15} aria-hidden="true" />开启新会话</Button><h3>最近会话</h3>{loading && <p role="status">正在恢复记录…</p>}{home && !home.conversations.length && <p className="sa-muted">第一段学习，从你的问题开始。</p>}
        <div className="sa-session-list">{home?.conversations.map(c => <div key={c.id} className="sa-session"><button disabled={busy || loading} aria-current={conversation?.id === c.id ? "true" : undefined} onClick={() => void openConversation(c.id)}>{c.title}</button><button className="sa-delete" aria-label={`删除会话：${c.title}`} disabled={busy || loading} onClick={() => void remove("conversation", c.id)}><Trash2 size={14} aria-hidden="true" /></button></div>)}</div>
        <details className="sa-observations"><summary>学习观察 · 待验证（{home?.observations.length ?? 0}）</summary><p>依据你的原话记录，可删除；不代表成绩或已掌握。显示最近 30 条。</p>{home?.observations.map(o => <article key={o.id}><strong>{o.topic}</strong><p>{o.observation}</p><blockquote>{o.evidence}</blockquote><button className="text-button" disabled={busy} onClick={() => void remove("observation", o.id)}>删除这条观察</button></article>)}</details>
      </aside>
      <div className="sa-chat panel" aria-busy={busy}>
        <h3>{conversation?.title || "今天想一起解决什么？"}</h3>
        <div ref={messageList} className="sa-messages" role="log" aria-label="会话记录" aria-relevant="additions">
          {!conversation && !loading && <div className="sa-empty"><BookOpen size={28} aria-hidden="true" /><p>可以从一门课、一道卡住的题，或今天的几件待办开始。</p><div className="sa-prompts">{["根据我的课程资料，先问我一个问题，了解我哪里不会。", "我想复盘今天的学习，请结合我的任务和专注记录帮我看看。", "帮我把明天的复习、运动和买生活用品安排成待办。"].map(p => <button key={p} disabled={busy} onClick={() => { setDraft(p); textarea.current?.focus(); }}>{p}</button>)}</div></div>}
          {conversation?.messages.map(message => <article key={message.id} className={`sa-message sa-${message.role}`}><strong>{message.role === "user" ? "你" : message.role === "error" ? "本轮未完成" : "林连理"}</strong><p>{message.content}</p>{message.trace?.length > 0 && <details className="sa-trace"><summary>本轮行动记录 · {message.trace.length} 步</summary>{message.trace.map((step, index) => <div key={index}><strong>{step.label} · {step.ok ? "已处理" : "未完成"}</strong><p>{step.summary}</p>{step.sources && sources(step.sources)}{step.proposalId && <a href="#agent-pending">查看并确认提议</a>}</div>)}</details>}</article>)}
          {busy && <p className="sa-working" role="status">正在读取记录、选择工具并处理问题，最多等待两分钟…</p>}
        </div>
        <form className="sa-composer" onSubmit={e => { e.preventDefault(); void send(); }}><label htmlFor="student-agent-message">说说你的目标，或接着回答刚才的问题</label><textarea ref={textarea} id="student-agent-message" value={draft} onChange={e => setDraft(e.target.value)} maxLength={2000} required disabled={busy || loading} placeholder="例如：我不理解极限的定义，先别给答案，请根据资料一步一步问我。" /><label className="sa-consent"><input type="checkbox" checked={allowMaterials} onChange={e => setAllowMaterials(e.target.checked)} disabled={busy} />允许本轮将检索到的课程资料片段提供给模型</label><div className="sa-send"><small>发送会使用已配置模型，包含输入、最近会话和学习概况，并按模型服务计费。</small><Button type="submit" disabled={busy || loading || !configured || !home || !draft.trim()}><Send size={15} aria-hidden="true" />{busy ? "正在处理…" : "发送"}</Button></div></form>
      </div>
    </div> : <div className="sa-materials-layout">
      <section className="panel sa-import"><h3>加入一份课程资料</h3><p className="sa-muted">粘贴教材选段、课件文字或笔记，也可导入 UTF-8 TXT/Markdown。每份 20–16000 字符，最多 30 份。PDF、图片和扫描件暂不支持。</p><form onSubmit={async e => {
        e.preventDefault(); setBusy(true); setError(""); setNotice("");
        try { await request("/api/materials", "POST", { title, subject, text }); setTitle(""); setText(""); await reload(); setNotice("资料已保存在本地。回到会话并允许使用资料后，即可按内容讲解和追问。"); }
        catch (e) { setError((e as Error).message); } finally { setBusy(false); }
      }}><label htmlFor="material-title">资料名称<input id="material-title" value={title} onChange={e => setTitle(e.target.value)} required maxLength={120} disabled={busy} placeholder="例如：高等数学 · 极限定义" /></label><label htmlFor="material-subject">课程<input id="material-subject" value={subject} onChange={e => setSubject(e.target.value)} required maxLength={30} disabled={busy} placeholder="例如：高等数学" /></label><label htmlFor="material-file">从文字文件读取<input id="material-file" type="file" accept=".txt,.md,text/plain,text/markdown" disabled={busy} onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return;
        try { if (!/\.(txt|md)$/i.test(file.name) || file.size > 60000) throw new Error("请选择小于 60KB 的 TXT/Markdown 文件；PDF 暂不支持。"); const content = await file.text(); if (content.includes("\uFFFD") || content.length > 16000) throw new Error("请使用 UTF-8 编码，且每份不超过 16000 字符。"); setText(content); if (!title) setTitle(file.name.replace(/\.(txt|md)$/i, "").slice(0, 120)); setError(""); } catch (error) { setError((error as Error).message); } finally { e.target.value = ""; }
      }} /></label><label htmlFor="material-text">资料正文<textarea id="material-text" value={text} onChange={e => setText(e.target.value)} required minLength={20} maxLength={16000} disabled={busy} placeholder="保留段落之间的空行，方便回溯原文位置。" /></label><span className="sa-muted">{text.length} / 16000 字符 · 导入不会调用云模型</span><Button type="submit" disabled={busy || loading || !home || materials.length >= 30}>保存资料</Button></form></section>
      <section className="panel"><h3>我的课程资料</h3>{!materials.length && <p className="sa-muted">还没有资料。导入后，检索结果会保留名称和段落位置。</p>}{materials.map(m => <article className="sa-material" key={m.id}><FileText size={18} aria-hidden="true" /><div><strong>{m.title}</strong><p>{m.subject} · {m._count.chunks} 个片段</p><button className="text-button" disabled={busy} aria-expanded={reading?.id === m.id} onClick={async () => { if (reading?.id === m.id) { setReading(null); return; } setBusy(true); try { setReading(await request(`/api/materials/${encodeURIComponent(m.id)}`)); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>查看原文</button></div><button className="sa-delete" disabled={busy} aria-label={`删除资料：${m.title}`} onClick={async () => { if (!window.confirm("删除此资料？历史会话中已经检索的片段快照仍会保留，删除会话可一并移除。")) return; setBusy(true); try { await request(`/api/materials/${encodeURIComponent(m.id)}`, "DELETE"); if (reading?.id === m.id) setReading(null); await reload(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}><Trash2 size={16} aria-hidden="true" /></button></article>)}{reading && <div className="sa-reading"><h4>{reading.title}</h4>{reading.chunks.map((c, i) => <section key={i}><small>{c.locator}</small><p>{c.text}</p></section>)}</div>}</section>
    </div>}
  </section>;
}
