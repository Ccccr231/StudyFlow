"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, useReducedMotion, animate } from "motion/react";
import { ArrowUpRight, Waves, LockKeyhole, MapPin, Sparkles } from "lucide-react";
import { scene } from "./scene";
import { GlassNameplate, spring } from "./motion";

export function Welcome({ onEnter }: { onEnter: () => void | Promise<void> }) {
  const entered = useRef(false);
  const mounted = useRef(true);
  const controls = useRef<ReturnType<typeof animate> | null>(null);
  const [entering, setEntering] = useState(false);
  const [retry, setRetry] = useState(false);
  const reduce = useReducedMotion();
  const progress = useMotionValue(0);
  const sceneryTransform = useTransform(progress, p => `scale(${1 + p * 0.045})`);
  const characterTransform = useTransform(progress, p => `translate3d(${p * 22}px,${-p * 18}px,0)`);
  const copyTransform = useTransform(progress, p => `translate3d(0,${-p * 18}px,0)`);
  const contentOpacity = useTransform(progress, [0, 0.32, 0.65], [1, 0.25, 0]);
  const avenueOpacity = useTransform(progress, [0, 0.24, 0.68], [0, 0, 1]);
  const captionOpacity = useTransform(progress, [0, 0.55, 0.85], [0, 0, 1]);
  const avenueTransform = useTransform(progress, p => `scale(${1.025 + p * 0.025})`);
  useEffect(() => {
    mounted.current = true;
    const image = new Image(); image.src = scene.avenue;
    return () => { mounted.current = false; controls.current?.stop(); };
  }, []);
  const commit = useCallback(async () => {
    if (entered.current) return;
    entered.current = true; setEntering(true); setRetry(false);
    try {
      const duration = reduce ? 0.14 : 1.05;
      controls.current = animate(progress, 1, { duration, ease: [0.22, 1, 0.36, 1] });
      // 不等待依赖动画帧的 finished Promise；后台/低帧率窗口也能进入。
      await new Promise<void>(resolve => setTimeout(resolve, duration * 1000));
      if (mounted.current) { controls.current?.stop(); progress.set(1); await onEnter(); }
    } catch {
      if (mounted.current) { entered.current = false; setEntering(false); setRetry(true); controls.current = animate(progress, 0, { duration: 0.2 }); }
    }
  }, [onEnter, progress, reduce]);
  return <section className={`welcome vn-welcome ${entering ? "is-entering" : ""}`} aria-label="StudyFlow 校园迎宾" aria-busy={entering}>
    <motion.div className="gate-backdrop" style={{ transform: reduce ? "none" : sceneryTransform }} aria-hidden="true" /><div className="vn-sky-light" aria-hidden="true" />
    <header className="welcome-header"><a className="brand" href="/" aria-label="StudyFlow 首页"><span className="brand-symbol"><Waves /></span>StudyFlow<span className="brand-cn">与你，把日常写成故事</span></a><span className="private-tag"><LockKeyhole size={13} /> 只属于你的学习篇章</span></header>
    <motion.div className="welcome-copy" style={{ transform: reduce ? "none" : copyTransform, opacity: contentOpacity }}><div className="vn-chapter"><span>序章</span><i />与你相遇的每一天</div><p className="welcome-overline">A LITTLE STORY OF OUR EVERYDAY</p><h1>今天的故事，<br />也<span>一起</span>写吧。</h1><p className="welcome-description">窗外有风，书页有光。<br />还有一位，嘴上说着「只是顺路」的学姐。</p><div className="vn-location"><MapPin size={13} />{scene.location}<span>校园日常 · 01</span></div></motion.div>
    <motion.div className="hero-scene" style={{ opacity: contentOpacity }}><motion.div className="hero-character" style={{ transform: reduce ? "none" : characterTransform }} role="img" aria-label="林连理，陪你开启校园学习日常" /><span className="vn-character-caption">林 连 理<small>LIN LIANLI</small></span></motion.div>
    <motion.div className="vn-welcome-dialogue" style={{ opacity: contentOpacity }}><GlassNameplate><strong>{scene.name}</strong><span>LIN LIANLI · 学姐</span></GlassNameplate><div className="vn-dialogue-surface"><div className="vn-dialogue-text"><span className="vn-dialogue-marker" aria-hidden="true">“</span><h2>{scene.greeting}</h2><p>{scene.aside}</p><span className="vn-local-line"><Sparkles size={11} />校园寄语</span></div><motion.button className="vn-choice vn-enter" disabled={entering} whileTap={reduce ? undefined : { scale: 0.97 }} transition={spring} onClick={() => void commit()}><span className="choice-number">01</span><span>{entering ? "学姐正带你走进校园…" : retry ? "再试一次，我们出发" : "准备好了，进入学习空间"}</span><ArrowUpRight size={18} /></motion.button></div></motion.div>
    <footer className="welcome-bottom"><span>STUDYFLOW / OUR EVERYDAY CHAPTER</span><button className="vn-click-hint" disabled={entering} onClick={() => void commit()}>点击进入，开启今天的篇章</button><span>PROLOGUE — 林连理</span></footer>
    <motion.div className="vn-campus-transition" style={{ opacity: avenueOpacity }} aria-hidden="true"><motion.div className="vn-avenue-backdrop" style={{ transform: reduce ? "none" : avenueTransform }} /><motion.div className="vn-transition-line" style={{ opacity: captionOpacity }}><small>林 连 理</small><p>走吧，别掉队。<br /><span>……我带你进去。</span></p><i /></motion.div></motion.div>
    <span className="sr-only" role="status">{entering ? "正在经过梧桐大道，进入学习空间。" : retry ? "进入失败，请重试。" : ""}</span>
  </section>;
}
