"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
const LiquidGlass = dynamic(() => import("liquid-glass-react"), { ssr: false });
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

/** 仅在小面积姓名牌应用折射；正文仍用可读的 CSS 玻璃衬底。 */
export function GlassNameplate({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return <div className={`glass-nameplate ${className}`}><div className="nameplate-optics" aria-hidden="true">{!reduce && <LiquidGlass style={{ position: "absolute", top: "50%", left: "50%", width: "100%" }} displacementScale={24} blurAmount={0.12} saturation={115} aberrationIntensity={0.2} elasticity={0} cornerRadius={12} padding="14px 18px"><span>&nbsp;</span></LiquidGlass>}</div><span className="nameplate-content">{children}</span></div>;
}
