"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { GlassBackdrop } from "./glass-backdrop";
export const spring = { type: "spring" as const, duration: 0.5, bounce: 0.2 };
export const smallSpring = { type: "spring" as const, duration: 0.25, bounce: 0.1 };

export function ScreenStage({ id, children }: { id: string; children: ReactNode }) {
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0 });
    const heading = stage.current?.querySelector<HTMLElement>("h1");
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }, [id]);
  // 屏幕内容立即挂载；迎宾自身负责转场，导航不等待退出动画。
  return <div className="screen-stage" ref={stage}><div key={id} className={`screen-layer screen-${id}`}>{children}</div></div>;
}

/** 姓名牌与卡片复用同一套背景折射，正文不参与滤镜。 */
export function GlassNameplate({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass-nameplate ${className}`}><GlassBackdrop /><span className="nameplate-content">{children}</span></div>;
}
