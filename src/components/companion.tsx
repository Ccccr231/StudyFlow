"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MessageCircle, Minus, Heart, X, Coffee, Sparkles, ArrowUpRight, BookOpen } from "lucide-react";
import dynamic from "next/dynamic";
import type { Dashboard } from "./types";
import { scene, characterLines } from "./scene";
import { GlassNameplate, spring, smallSpring } from "./motion";
const VisualNovel = dynamic(() => import("./visual-novel").then(module => module.VisualNovel), { ssr: false });

export function Companion({ data, onAgent }: { data: Dashboard; onAgent: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [reply, setReply] = useState<"praise" | "rest" | null>(null);
  const reduce = useReducedMotion();
  const dock = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const done = data.stats.todayCompleted;
  const total = data.stats.todayTotal;
  const focusing = data.activeFocus?.status === "RUNNING";
  const mood = reply === "praise" ? "blushing" : focusing ? "focused" : total > 0 && done === total ? "happy" : "hello";
  const line = reply ? characterLines[reply] : characterLines[focusing ? "focused" : total > 0 && done === total ? "happy" : "hello"];
  useEffect(() => { setReply(null); }, [focusing, done, total]);
  useEffect(() => {
    if (!expanded) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setExpanded(false); trigger.current?.focus(); } };
    const outside = (event: PointerEvent) => { if (!dock.current?.contains(event.target as Node)) setExpanded(false); };
    document.addEventListener("keydown", close); document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", outside); };
  }, [expanded]);
  const transition = reduce ? { duration: 0.12 } : smallSpring;
  return <><motion.aside ref={dock} className={`companion vn-companion ${expanded ? "expanded" : ""} ${collapsed ? "is-collapsed" : ""}`} aria-label="林连理 · 常驻学习伙伴">
    <AnimatePresence initial={false}>{expanded && !collapsed && <motion.section key="dialogue" className={`vn-companion-dialogue mood-${mood}`} aria-labelledby="lianli-dialogue-title" initial={{ opacity: 0, transform: reduce ? "none" : "translate3d(0,16px,0) scale(0.97)" }} animate={{ opacity: 1, transform: "translate3d(0,0,0) scale(1)" }} exit={{ opacity: 0, transform: reduce ? "none" : "translate3d(0,16px,0) scale(0.97)" }} transition={transition}>
      <GlassNameplate><strong id="lianli-dialogue-title">{scene.name}</strong><span>你的嘴硬心软学姐</span></GlassNameplate><div className="vn-dialogue-controls"><button aria-label="最小化林连理" onClick={() => { setExpanded(false); setCollapsed(true); }}><Minus size={15} /></button><button aria-label="关闭林连理对话" onClick={() => { setExpanded(false); trigger.current?.focus(); }}><X size={15} /></button></div>
      <div className="companion-dialogue-body"><div className={`dialogue-portrait portrait-${mood}`} role="img" aria-label={`林连理${mood === "blushing" ? "害羞" : mood === "focused" ? "认真" : "微笑"}的表情`} /><div><span className="vn-character-status">{mood === "blushing" ? "「才、才没有高兴呢」" : focusing ? "「安静陪你一会儿」" : total > 0 && done === total ? "「做得……还不错嘛」" : "「只是刚好路过」"}</span><AnimatePresence mode="wait" initial={false}><motion.p key={line} aria-live="polite" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>{line}</motion.p></AnimatePresence></div></div>
      <div className="vn-dialogue-choices"><button onClick={() => setReply("praise")}><Heart size={13} /><span>学姐，今天也谢谢你</span><ArrowUpRight size={13} /></button><button onClick={() => setReply("rest")}><Coffee size={13} /><span>我想稍微休息一下</span><ArrowUpRight size={13} /></button><button className="story-entry" onClick={() => { setExpanded(false); setStoryOpen(true); }}><BookOpen size={14} /><span>羁遇故事：自习室见！<small>雨夜 · 自习室 / 她说，只是顺路。</small></span><ArrowUpRight size={13} /></button><button onClick={() => { setExpanded(false); onAgent(); }}><MessageCircle size={13} /><span>一起看看学习计划</span><ArrowUpRight size={13} /></button></div><span className="vn-dialogue-footnote"><Sparkles size={10} />角色互动 · 本地预设台词</span>
    </motion.section>}</AnimatePresence>
    <AnimatePresence mode="wait" initial={false}>{collapsed ? <motion.button key="mini" className="companion-mini" aria-label="展开林连理" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} whileTap={reduce ? undefined : { scale: 0.94 }} transition={spring} onClick={() => setCollapsed(false)}><Heart size={20} /></motion.button> : <motion.div key="pet" className="vn-pet-dock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}><motion.button ref={trigger} className={`pet-body pet-${mood}`} aria-expanded={expanded} aria-label={`林连理：${focusing ? "专注陪伴" : mood === "happy" ? "开心" : "点击互动"}`} onClick={() => { setExpanded(v => !v); setReply(null); }} animate={{ y: reduce ? 0 : mood === "blushing" ? -4 : 0, rotate: reduce ? 0 : mood === "blushing" ? -3 : 0 }} whileTap={reduce ? undefined : { y: 3, scale: 0.96 }} transition={spring} /><span className="pet-name-tag"><i />林连理</span><div className="pet-shadow" /></motion.div>}</AnimatePresence>
  </motion.aside><VisualNovel open={storyOpen} onClose={() => { setStoryOpen(false); requestAnimationFrame(() => trigger.current?.focus()); }} /></>;
}
