"use client";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

interface FloatingLeafProps {
  className?: string;
  size?: number;
  fillColor?: string;
  strokeColor?: string;
  fillOpacity?: number;
  strokeOpacity?: number;
}

export function FloatingLeaf({
  className = "",
  size = 70,
  fillColor = "#A7C7A1",
  strokeColor = "#7BAE7F",
  fillOpacity = 0.15,
  strokeOpacity = 0.28,
}: FloatingLeafProps) {
  const { scrollYProgress } = useScroll();
  const reduced = useReducedMotion();

  const y = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [0, 340]);
  const rotate = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [-8, 48]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], reduced ? [0, 0, 0] : [0, 18, 6]);
  const opacity = useTransform(scrollYProgress, [0, 0.7, 0.92], [1, 0.55, 0]);

  return (
    <motion.div
      aria-hidden="true"
      className={className}
      style={{ y, rotate, rotateX, opacity, transformStyle: "preserve-3d" }}
    >
      <svg
        width={size}
        height={Math.round(size * 1.45)}
        viewBox="0 0 60 87"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M30 4 C52 9, 62 28, 59 48 C56 68, 42 83, 30 84 C18 83, 4 68, 1 48 C-2 28, 8 9, 30 4 Z"
          fill={fillColor}
          fillOpacity={fillOpacity}
        />
        <path
          d="M30 4 C52 9, 62 28, 59 48 C56 68, 42 83, 30 84 C18 83, 4 68, 1 48 C-2 28, 8 9, 30 4 Z"
          stroke={strokeColor}
          strokeWidth="1.2"
          fill="none"
          strokeOpacity={strokeOpacity}
        />
        <path
          d="M30 4 Q29.5 44, 30 84"
          stroke={strokeColor}
          strokeWidth="0.8"
          strokeOpacity={strokeOpacity * 0.65}
        />
        <path d="M30 24 Q43 32, 54 40" stroke={strokeColor} strokeWidth="0.6" strokeOpacity={strokeOpacity * 0.5} />
        <path d="M30 24 Q17 32, 6 40" stroke={strokeColor} strokeWidth="0.6" strokeOpacity={strokeOpacity * 0.5} />
        <path d="M30 44 Q41 51, 51 57" stroke={strokeColor} strokeWidth="0.6" strokeOpacity={strokeOpacity * 0.5} />
        <path d="M30 44 Q19 51, 9 57" stroke={strokeColor} strokeWidth="0.6" strokeOpacity={strokeOpacity * 0.5} />
      </svg>
    </motion.div>
  );
}
