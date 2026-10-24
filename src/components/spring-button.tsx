"use client";
import type { ComponentProps } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "./ui/button";
import { smallSpring } from "./motion";
const MotionButton = motion.create(Button);
export function SpringButton(props: Omit<ComponentProps<typeof Button>, "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd">) {
  const reduce = useReducedMotion();
  return <MotionButton {...props} whileTap={reduce ? undefined : { scale: 0.97 }} transition={smallSpring} />;
}
