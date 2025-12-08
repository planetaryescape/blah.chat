"use client";

import removeMarkdown from "remove-markdown";

/**
 * Convert markdown into plain text that is optimized for TTS playback.
 * Uses the well-maintained `remove-markdown` library to strip formatting,
 * then applies additional TTS-specific transformations.
 *
 * @see https://www.npmjs.com/package/remove-markdown
 */
export function markdownToSpeechText(markdown: string): string {
  const raw = markdown ?? "";
  if (!raw.trim()) return "";

  // Use remove-markdown library with options optimized for TTS
  let text = removeMarkdown(raw, {
    stripListLeaders: true,     // Remove list bullets/numbers
    listUnicodeChar: "",        // Don't replace bullets with unicode
    gfm: true,                  // Support GitHub Flavored Markdown
    useImgAltText: true,        // Keep image alt text
  });

  // Additional TTS-specific transformations
  // Handle common abbreviations for better TTS pronunciation
  text = text.replace(/\be\.g\.\s*/gi, "for example, ");
  text = text.replace(/\bi\.e\.\s*/gi, "that is, ");
  text = text.replace(/\betc\.\s*/gi, "etcetera ");
  text = text.replace(/\bvs\.\s*/gi, "versus ");

  // Remove any remaining URLs
  text = text.replace(/https?:\/\/[^\s]+/g, "");

  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
}
