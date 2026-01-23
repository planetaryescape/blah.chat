/**
 * Hook for worker-based markdown parsing
 *
 * Returns parsed HTML for large completed messages.
 * Falls back to null (caller uses Streamdown) when:
 * - Content is streaming
 * - Content is below threshold
 * - Worker is unavailable
 * - Parse fails
 *
 * SECURITY: HTML is sanitized via DOMPurify on main thread
 * (Workers don't have DOM APIs needed by DOMPurify)
 */

import DOMPurify from "dompurify";
import { useEffect, useState } from "react";
import { getMarkdownCache } from "@/lib/markdown/cache";
import { parseMarkdownInWorker } from "@/lib/markdown/worker-manager";

/**
 * Sanitize HTML from worker to prevent XSS
 * CRITICAL: Must be called on main thread (needs DOM APIs)
 */
function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
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
}

// Minimum content size to use worker (5KB)
// Smaller content parses fast enough on main thread (~50ms)
const SIZE_THRESHOLD = 5000;

interface UseWorkerMarkdownResult {
  /** Parsed HTML, or null if worker not used/available */
  html: string | null;
  /** True when actively parsing */
  isParsing: boolean;
  /** Error message if parse failed */
  error: string | null;
}

export function useWorkerMarkdown(
  content: string,
  isStreaming: boolean,
): UseWorkerMarkdownResult {
  const [html, setHtml] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Don't use worker for streaming content (Streamdown handles partial markdown)
    if (isStreaming) {
      setHtml(null);
      setError(null);
      return;
    }

    // Don't use worker for small content (not worth the overhead)
    if (content.length < SIZE_THRESHOLD) {
      setHtml(null);
      setError(null);
      return;
    }

    // Check cache first
    const cache = getMarkdownCache();
    const cached = cache.get(content);
    if (cached) {
      setHtml(cached);
      setError(null);
      return;
    }

    // Parse in worker
    let cancelled = false;
    setIsParsing(true);
    setError(null);

    parseMarkdownInWorker(content)
      .then((result) => {
        if (cancelled) return;

        if (result) {
          // CRITICAL: Sanitize HTML on main thread (worker lacks DOM APIs)
          const sanitized = sanitizeHtml(result);
          // Cache sanitized result
          cache.set(content, sanitized);
          setHtml(sanitized);
          setError(null);
        } else {
          // Worker unavailable, let caller use Streamdown
          setHtml(null);
          setError(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setHtml(null);
        setError(err instanceof Error ? err.message : "Parse failed");
      })
      .finally(() => {
        if (!cancelled) setIsParsing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [content, isStreaming]);

  return { html, isParsing, error };
}
