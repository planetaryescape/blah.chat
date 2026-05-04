"use client";

import { domAnimation, LazyMotion, MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * MotionProvider wraps the app with Framer Motion's MotionConfig
 * to globally respect the user's reduced motion preference, plus
 * LazyMotion to load animation features on demand (saves ~30kb in
 * the initial bundle when components use the lightweight `m` import
 * instead of the full `motion` API).
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
