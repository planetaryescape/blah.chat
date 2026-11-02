"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * MotionProvider wraps the app with Framer Motion's MotionConfig
 * to globally respect the user's reduced motion preference.
 *
 * This ensures all Framer Motion animations in the app
 * automatically disable when prefers-reduced-motion is set.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
