/**
 * Markdown parsing web worker
 * Offloads expensive markdown → HTML conversion from main thread
 *
 * Uses:
 * - marked: Fast markdown parser
 * - shiki: Syntax highlighting (async initialization)
 * - katex: Math rendering
 * - dompurify: XSS sanitization (CRITICAL - all output sanitized)
 */

import DOMPurify from "dompurify";
import katex from "katex";
import { Marked, type TokenizerExtension } from "marked";
import type { BundledLanguage, BundledTheme, Highlighter } from "shiki";
import { createHighlighter } from "shiki";

// Worker message types
interface WorkerRequest {
  id: string;
  content: string;
}

interface WorkerResponse {
  id: string;
  html: string;
  duration: number;
  error?: string;
}

// Shiki highlighter - lazily initialized
let highlighter: Highlighter | null = null;
let highlighterPromise: Promise<Highlighter> | null = null;

// Common languages to pre-load
const PRELOAD_LANGUAGES: BundledLanguage[] = [
  "javascript",
  "typescript",
  "python",
  "bash",
  "json",
  "html",
  "css",
  "markdown",
  "jsx",
  "tsx",
  "sql",
  "yaml",
  "go",
  "rust",
  "java",
  "cpp",
  "c",
  "shell",
];

const THEME: BundledTheme = "github-dark";

async function getHighlighter(): Promise<Highlighter> {
  if (highlighter) return highlighter;
  if (highlighterPromise) return highlighterPromise;

  highlighterPromise = createHighlighter({
    themes: [THEME],
    langs: PRELOAD_LANGUAGES,
  });

  highlighter = await highlighterPromise;
  return highlighter;
}

// Bible book patterns for simple detection (covers most common references)
const BIBLE_BOOKS =
  /\b(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1\s*Samuel|2\s*Samuel|1\s*Kings|2\s*Kings|1\s*Chronicles|2\s*Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song\s*of\s*Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1\s*Corinthians|2\s*Corinthians|Galatians|Ephesians|Philippians|Colossians|1\s*Thessalonians|2\s*Thessalonians|1\s*Timothy|2\s*Timothy|Titus|Philemon|Hebrews|James|1\s*Peter|2\s*Peter|1\s*John|2\s*John|3\s*John|Jude|Revelation|Gen|Exod?|Lev|Num|Deut|Josh|Judg|1\s*Sam|2\s*Sam|1\s*Kgs|2\s*Kgs|1\s*Chr|2\s*Chr|Neh|Esth|Ps|Prov|Eccl|Song|Isa|Jer|Lam|Ezek|Dan|Hos|Ob|Jon|Mic|Nah|Hab|Zeph|Hag|Zech|Mal|Matt?|Mk|Lk|Jn|Rom|1\s*Cor|2\s*Cor|Gal|Eph|Phil|Col|1\s*Thess|2\s*Thess|1\s*Tim|2\s*Tim|Phlm|Heb|Jas|1\s*Pet|2\s*Pet|1\s*Jn|2\s*Jn|3\s*Jn|Rev)\b/i;

/**
 * Normalize LaTeX delimiters to standard format
 * AI models often use \(...\) and \[...\] but we need $$...$$ for KaTeX
 */
function normalizeLatexDelimiters(text: string): string {
  if (!text.includes("\\(") && !text.includes("\\[")) return text;

  const parts = text.split(/(`{3}[\s\S]*?`{3}|`[^`\n]+`)/);

  return parts
    .map((part) => {
      if (part.startsWith("`")) return part;
      let result = part.replace(/\\\(([^)]*?)\\\)/g, "$$$$$1$$$$");
      result = result.replace(/\\\[([^\]]*?)\\\]/g, "\n$$$$$1$$\n");
      return result;
    })
    .join("");
}

/**
 * Process citations [n] -> [[n]](#source-n)
 */
function processCitations(text: string): string {
  if (!text.includes("[")) return text;

  const parts = text.split(/(`{3}[\s\S]*?`{3}|`[^`\n]+`)/);

  return parts
    .map((part) => {
      if (part.startsWith("`")) return part;
      return part.replace(/\[(\d+)\]/g, "[$1](#source-$1)");
    })
    .join("");
}

/**
 * Convert Bible reference to OSIS format for linking
 * Simple implementation - handles explicit [[ref]] and common patterns
 */
function toOsis(ref: string): string {
  // Normalize: "John 3:16" -> "John.3.16"
  return ref
    .trim()
    .replace(/\s+/g, ".")
    .replace(/:/g, ".")
    .replace(/(\d)\.(\d)/g, "$1.$2");
}

/**
 * Process Bible verse references
 * - Explicit: [[John 3:16]] -> [John 3:16](bible://John.3.16)
 * - Auto-detect: "John 3:16" -> linked (simplified pattern matching)
 */
function processBibleVerses(text: string): string {
  const parts = text.split(/(`{3}[\s\S]*?`{3}|`[^`\n]+`|\[[^\]]+\]\([^)]+\))/);

  return parts
    .map((part) => {
      if (part.startsWith("`") || part.startsWith("[")) return part;

      // Explicit [[John 3:16]] syntax
      let result = part.replace(/\[\[([^\]]+)\]\]/g, (_, ref) => {
        const osis = toOsis(ref);
        return `[${ref.trim()}](bible://${osis})`;
      });

      // Auto-detect common patterns like "John 3:16" or "1 Corinthians 13:4-7"
      // Pattern: Book Chapter:Verse(-Verse)?
      const versePattern = new RegExp(
        `(${BIBLE_BOOKS.source})\\s+(\\d+):(\\d+)(?:-(\\d+))?`,
        "gi",
      );

      result = result.replace(versePattern, (match, book, chapter, verse) => {
        // Skip if already in a markdown link
        const idx = result.indexOf(match);
        const before = result.slice(0, idx);
        if (before.match(/\[[^\]]*$/)) return match;

        const osis = toOsis(match);
        return `[${match}](bible://${osis})`;
      });

      return result;
    })
    .join("");
}

/**
 * Preprocess content before markdown parsing
 */
function preprocessContent(content: string): string {
  let processed = normalizeLatexDelimiters(content);
  processed = processCitations(processed);
  processed = processBibleVerses(processed);
  return processed;
}

/**
 * Render math with KaTeX
 */
function renderMath(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: true, // Allow \url, \href etc
      macros: {
        "\\ce": "\\mathrm{#1}", // Basic chemistry support
      },
    });
  } catch (e) {
    console.warn("[Worker] KaTeX error:", e);
    return `<span class="katex-error">${tex}</span>`;
  }
}

/**
 * Create marked instance with custom extensions
 */
async function createMarkedInstance(): Promise<Marked> {
  const hl = await getHighlighter();

  const marked = new Marked();

  // Math extension - handle $$...$$ blocks
  const mathBlock: TokenizerExtension = {
    name: "mathBlock",
    level: "block",
    start(src) {
      return src.match(/^\$\$/)?.index;
    },
    tokenizer(src) {
      const match = src.match(/^\$\$([\s\S]*?)\$\$/);
      if (match) {
        return {
          type: "mathBlock",
          raw: match[0],
          text: match[1].trim(),
        };
      }
      return undefined;
    },
  };

  const mathInline: TokenizerExtension = {
    name: "mathInline",
    level: "inline",
    start(src) {
      return src.match(/\$\$/)?.index;
    },
    tokenizer(src) {
      // Inline math: $$...$$ on same line (not starting line)
      const match = src.match(/^\$\$([^\n]+?)\$\$/);
      if (match) {
        return {
          type: "mathInline",
          raw: match[0],
          text: match[1].trim(),
        };
      }
      return undefined;
    },
  };

  marked.use({
    extensions: [mathBlock, mathInline],
  });

  // Custom renderer with type assertion for custom token types (mathBlock/mathInline)
  marked.use({
    renderer: {
      mathBlock({ text }: { text: string }) {
        return `<div class="math-display">${renderMath(text, true)}</div>`;
      },
      mathInline({ text }: { text: string }) {
        return `<span class="math-inline">${renderMath(text, false)}</span>`;
      },
      code({ text, lang }: { text: string; lang?: string }) {
        const language = lang || "text";

        // Mermaid diagrams - pass through as-is (rendered client-side)
        if (language === "mermaid") {
          return `<pre class="mermaid-placeholder" data-code="${encodeURIComponent(text)}"><code class="language-mermaid">${text}</code></pre>`;
        }

        try {
          // Try syntax highlighting
          const html = hl.codeToHtml(text, {
            lang: language as BundledLanguage,
            theme: THEME,
          });

          return `<div class="code-block-wrapper" data-language="${language}">${html}</div>`;
        } catch {
          // Fallback for unknown languages
          return `<div class="code-block-wrapper" data-language="${language}"><pre class="shiki github-dark"><code>${escapeHtml(text)}</code></pre></div>`;
        }
      },
      codespan({ text }: { text: string }) {
        return `<code class="inline-code">${escapeHtml(text)}</code>`;
      },
      link({
        href,
        title,
        text,
      }: {
        href: string;
        title?: string | null;
        text: string;
      }) {
        // Citation links
        if (href?.startsWith("#source-")) {
          return `<a href="${href}" class="citation-link"${title ? ` title="${title}"` : ""}>${text}</a>`;
        }

        // Bible verse links
        if (href?.startsWith("bible://")) {
          return `<a href="${href}" class="bible-verse-link" data-osis="${href.replace("bible://", "")}"${title ? ` title="${title}"` : ""}>${text}</a>`;
        }

        // External links
        return `<a href="${href}" target="_blank" rel="noopener noreferrer"${title ? ` title="${title}"` : ""}>${text}</a>`;
      },
      image({
        href,
        title,
        text,
      }: {
        href: string;
        title?: string | null;
        text: string;
      }) {
        return `<img src="${href}" alt="${text || "Image"}" class="rounded-lg max-w-full my-4 block" style="max-height: 600px; object-fit: contain;" loading="lazy"${title ? ` title="${title}"` : ""} />`;
      },
      // Type assertion needed for custom extension tokens
    } as Record<string, unknown>,
  });

  return marked;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Cached marked instance
let markedInstance: Marked | null = null;
let markedPromise: Promise<Marked> | null = null;

async function getMarked(): Promise<Marked> {
  if (markedInstance) return markedInstance;
  if (markedPromise) return markedPromise;

  markedPromise = createMarkedInstance();
  markedInstance = await markedPromise;
  return markedInstance;
}

/**
 * Parse markdown content to sanitized HTML
 */
async function parseMarkdown(content: string): Promise<string> {
  const marked = await getMarked();
  const preprocessed = preprocessContent(content);
  const html = await marked.parse(preprocessed);

  // CRITICAL: Sanitize all output to prevent XSS
  // DOMPurify is configured to allow safe HTML elements
  const sanitized = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_TAGS: [
      "math",
      "semantics",
      "mrow",
      "mi",
      "mo",
      "mn",
      "msup",
      "msub",
      "mfrac",
      "mtext",
      "annotation",
    ],
    ADD_ATTR: [
      "data-language",
      "data-code",
      "data-osis",
      "aria-hidden",
      "encoding",
      "xmlns",
    ],
    ALLOW_DATA_ATTR: true,
    ADD_URI_SAFE_ATTR: ["href"],
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|bible):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });

  return sanitized;
}

// Worker message handler
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, content } = event.data;
  const startTime = performance.now();

  try {
    const html = await parseMarkdown(content);
    const duration = performance.now() - startTime;

    self.postMessage({
      id,
      html,
      duration,
    } satisfies WorkerResponse);
  } catch (error) {
    const duration = performance.now() - startTime;

    self.postMessage({
      id,
      html: "",
      duration,
      error: error instanceof Error ? error.message : "Unknown error",
    } satisfies WorkerResponse);
  }
};

// Signal worker is ready
self.postMessage({ type: "ready" });
