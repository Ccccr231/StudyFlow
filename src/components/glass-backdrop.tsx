"use client";

import { useEffect, useRef } from "react";
import { createGlass } from "@/lib/liquid-glass.js";

/** 只折射与固定校园场景对齐的装饰副本，文字和原生控件留在清晰的上层。 */
export function GlassBackdrop() {
  const surface = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const preference = matchMedia("(prefers-reduced-transparency: reduce), (prefers-contrast: more)");
    let glass: ReturnType<typeof createGlass> | undefined;
    let frame = 0;
    const align = () => {
      frame = 0;
      const { left, top } = element.getBoundingClientRect();
      const stage = element.closest(".vn-welcome")?.querySelector(".gate-backdrop")?.getBoundingClientRect();
      const width = stage?.width ?? innerWidth;
      const height = stage?.height ?? innerHeight;
      // 现有四张校园背景均为 1672 × 941，与场景的 cover 裁切保持对齐。
      const scale = Math.max(width / 1672, height / 941);
      const imageWidth = 1672 * scale;
      const imageHeight = 941 * scale;
      element.style.backgroundSize = `${imageWidth}px ${imageHeight}px`;
      element.style.backgroundPosition = `${(stage?.left ?? 0) + (width - imageWidth) / 2 - left}px ${(stage?.top ?? 0) + (height - imageHeight) / 2 - top}px`;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(align); };
    const configure = () => {
      glass?.destroy();
      glass = undefined;
      if (preference.matches) return;
      const host = element.parentElement;
      glass = createGlass(element, {
        fit: true,
        radius: Number.parseFloat(host ? getComputedStyle(host).borderRadius : "") || 22,
        refraction: 20,
        bezel: 0.32,
        curvature: 4,
        chroma: 0.12,
        blur: 1.5,
        specular: 0.5,
        mapScale: 1,
      });
    };
    align();
    configure();
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    preference.addEventListener("change", configure);
    return () => {
      glass?.destroy();
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      preference.removeEventListener("change", configure);
    };
  }, []);

  return <span ref={surface} className="glass-backdrop" aria-hidden="true" />;
}
