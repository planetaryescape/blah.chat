"use client";

import { marked } from "marked";

/**
 * Convert markdown into plain text that is friendlier for TTS playback.
 * Removes formatting characters and collapses whitespace so the reader
 * doesn't narrate markdown syntax like asterisks or backticks.
 */
export function markdownToSpeechText(markdown: string): string {
  const raw = markdown ?? "";
  if (!raw.trim()) return "";

  // Prefer a DOM-based strip so we preserve natural sentence breaks.
  try {
    const html = marked.parse(raw);
    const container =
      typeof document !== "undefined" ? document.createElement("div") : null;

    if (container) {
      container.innerHTML = typeof html === "string" ? html : String(html);
      const text =
        container.textContent || container.innerText || container.innerHTML;
      return text.replace(/\s+/g, " ").trim();
    }
  } catch (error) {
    // Fall through to regex-based stripping below
    console.error("Failed to strip markdown for TTS:", error);
  }

  // Fallback: simple markdown token removal
  return raw
    .replace(/[`*_>#[\]()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
