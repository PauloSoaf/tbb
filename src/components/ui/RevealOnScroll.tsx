"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function RevealOnScroll({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduceMotion = useReducedMotion();
  return <motion.div
    className={className}
    initial={reduceMotion ? false : { opacity: 0, y: 18 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: .12 }}
    transition={reduceMotion ? { duration: 0, delay: 0 } : { duration: .42, delay, ease: [.22, 1, .36, 1] }}
  >{children}</motion.div>;
}
