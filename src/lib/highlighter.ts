import { createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import type { HighlighterCore } from "shiki/core";

// Import themes
import githubDark from "shiki/themes/github-dark.mjs";

// Import common languages
import typescript from "shiki/langs/typescript.mjs";
import javascript from "shiki/langs/javascript.mjs";
import tsx from "shiki/langs/tsx.mjs";
import jsx from "shiki/langs/jsx.mjs";
import python from "shiki/langs/python.mjs";
import rust from "shiki/langs/rust.mjs";
import go from "shiki/langs/go.mjs";
import java from "shiki/langs/java.mjs";
import html from "shiki/langs/html.mjs";
import css from "shiki/langs/css.mjs";
import json from "shiki/langs/json.mjs";
import markdown from "shiki/langs/markdown.mjs";
import yaml from "shiki/langs/yaml.mjs";
import bash from "shiki/langs/bash.mjs";
import shell from "shiki/langs/shell.mjs";

let highlighter: HighlighterCore | null = null;

export function getHighlighter(): HighlighterCore {
  if (!highlighter) {
    highlighter = createHighlighterCoreSync({
      themes: [githubDark],
      langs: [
        typescript,
        javascript,
        tsx,
        jsx,
        python,
        rust,
        go,
        java,
        html,
        css,
        json,
        markdown,
        yaml,
        bash,
        shell,
      ],
      engine: createJavaScriptRegexEngine(),
    });
  }
  return highlighter;
}

// Set of languages we have loaded - used for fallback handling
const SUPPORTED_LANGUAGES = new Set([
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "python",
  "rust",
  "go",
  "java",
  "html",
  "css",
  "json",
  "markdown",
  "yaml",
  "bash",
  "shell",
  // Common aliases
  "ts",
  "js",
  "py",
  "md",
  "yml",
  "sh",
]);

// Language alias mapping for common variations
const LANGUAGE_ALIASES: Record<string, string> = {
  ts: "typescript",
  js: "javascript",
  py: "python",
  md: "markdown",
  yml: "yaml",
  sh: "bash",
  zsh: "bash",
  fish: "bash",
};

/**
 * Normalize language identifier to a supported language
 */
function normalizeLanguage(lang: string): string {
  const normalized = lang.toLowerCase().trim();
  return LANGUAGE_ALIASES[normalized] || normalized;
}

/**
 * Check if a language is supported by the highlighter
 */
export function isLanguageSupported(lang: string): boolean {
  return SUPPORTED_LANGUAGES.has(normalizeLanguage(lang));
}

/**
 * Escape HTML entities for safe rendering as plain text fallback
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generate a plain text fallback HTML for code that can't be highlighted
 */
function createPlainTextFallback(code: string): string {
  return `<pre class="shiki" style="background-color:#24292e;color:#e1e4e8"><code>${escapeHtml(code)}</code></pre>`;
}

export type HighlightResult = {
  html: string;
  error?: string;
};

/**
 * Highlight code with Shiki, with graceful error handling
 * Returns an object with the HTML and optional error message
 */
export function highlightCode(code: string, lang: string): HighlightResult {
  const normalizedLang = normalizeLanguage(lang);

  // Check if language is supported before attempting to highlight
  if (!isLanguageSupported(normalizedLang)) {
    return {
      html: createPlainTextFallback(code),
      error: `Language "${lang}" is not supported, showing as plain text`,
    };
  }

  try {
    const highlighter = getHighlighter();
    const html = highlighter.codeToHtml(code, {
      lang: normalizedLang,
      theme: "github-dark",
    });
    return { html };
  } catch (error) {
    // Log the error for debugging but don't crash
    console.warn(
      `[Shiki] Failed to highlight code with language "${lang}":`,
      error
    );

    // Return escaped plain text as fallback
    return {
      html: createPlainTextFallback(code),
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during syntax highlighting",
    };
  }
}
