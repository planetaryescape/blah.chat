"use client";

import { useEffect } from "react";
import { useUserPreference } from "@/hooks/useUserPreference";

const TEXT_SCALE_CLASSES = [
  "text-scale-75",
  "text-scale-100",
  "text-scale-125",
  "text-scale-150",
  "text-scale-175",
  "text-scale-200",
] as const;

/**
 * Hook that applies accessibility settings (high contrast, text scale)
 * to the document element. Call this at the app root to initialize
 * a11y preferences on mount.
 *
 * - High contrast: adds/removes .high-contrast class on <html>
 * - Text scale: adds .text-scale-{value} class on <html>
 */
export function useAccessibilitySettings() {
  const highContrastMode = useUserPreference("highContrastMode") ?? false;
  const textScale = useUserPreference("textScale") ?? 100;

  // Combined effect to avoid race conditions when modifying classList
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("high-contrast", highContrastMode);
    html.classList.remove(...TEXT_SCALE_CLASSES);
    html.classList.add(`text-scale-${textScale}`);
  }, [highContrastMode, textScale]);
}
