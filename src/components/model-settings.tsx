"use client";
import { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { SpringButton as Button } from "./spring-button";
import { Input } from "./ui/input";
import type { Dashboard } from "./types";

export function ModelSettings({ status, busy, mutate }: {
  status: Dashboard["model"]; busy: boolean;
  mutate: (url: string, method: string, value: unknown) => Promise<boolean>;
}) {
  const [provider, setProvider] = useState(status.provider || "deepseek");
  const [model, setModel] = useState(status.configured ? status.name : "deepseek-flash");
  const [apiKey, setApiKey] = useState("");
  return <section className="panel personal-model-settings">
    <div className="panel-heading"><h2>连接你自己的 AI</h2><KeyRound size={19} aria-hidden="true" /></div>
    <p className="model-settings-description">填写自己的 API Key，即可使用学习教练。模型费用由你在服务商处的账户承担。</p>
    <p className="model-settings-status" role="status">{status.configured ? `已保存 · ${status.provider === "openai" ? "OpenAI" : "DeepSeek"} / ${status.name}` : "尚未配置；手动规划和专注计时仍可使用。"}</p>
    <form onSubmit={async e => {
      e.preventDefault();
      if (await mutate("/api/model-settings", "PUT", { provider, model, apiKey })) setApiKey("");
    }}>
      <label htmlFor="model-provider">模型服务</label>
      <select id="model-provider" value={provider} disabled={busy} onChange={e => {
        setProvider(e.target.value); setModel(e.target.value === "openai" ? "gpt-4.1-mini" : "deepseek-flash"); setApiKey("");
      }}><option value="deepseek">DeepSeek</option><option value="openai">OpenAI</option></select>
      <label htmlFor="personal-model-name">模型名称</label>
      <Input id="personal-model-name" value={model} onChange={e => setModel(e.target.value)} required maxLength={100} pattern="[a-zA-Z0-9._:\/\-]+" disabled={busy} aria-describedby="model-name-help" />
      <small id="model-name-help">填写该服务商支持工具调用的模型名称。</small>
      <label htmlFor="personal-api-key">API Key{status.configured ? "（填写新密钥以替换）" : ""}</label>
      <Input id="personal-api-key" type="password" autoComplete="off" spellCheck={false} value={apiKey} onChange={e => setApiKey(e.target.value)} required minLength={8} maxLength={512} placeholder="粘贴你的 API Key" disabled={busy} aria-describedby="model-key-help" />
      <small id="model-key-help">密钥按账号加密保存，不会回显，也不会包含在数据导出中。保存配置不代表已验证连接，发送消息时会实际调用。</small>
      <div className="model-settings-actions"><Button type="submit" disabled={busy || apiKey.trim().length < 8 || !model.trim()}>{busy ? "正在保存…" : status.configured ? "替换配置" : "保存配置"}</Button><Button type="button" variant="outline" disabled={busy || !status.configured} onClick={async () => { if (await mutate("/api/model-settings", "DELETE", {})) setApiKey(""); }}>移除密钥</Button></div>
    </form>
    <div className="settings-note"><ShieldCheck size={18} aria-hidden="true" /><p>发送消息时，输入、最近会话和学习概况会提供给所选模型服务。课程资料仅在你勾选本轮许可后提供。</p></div>
  </section>;
}
