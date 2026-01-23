# Web Worker for Markdown Parsing

> **Phase**: P8-performance | **Effort**: 4h | **Impact**: 75-80% faster perceived performance
> **Dependencies**: None | **Breaking**: No
> **Status**: ✅ Complete (2026-01-21)

---

## Problem Statement

Markdown parsing blocks the main thread for 200-500ms on large messages, causing UI freezes where users can't scroll, click, or type. Frame rates drop to 30-45fps during parsing, making the app feel sluggish with long AI responses.

### Current Behavior

- Large messages (10,000 chars): 500ms parse time
- Main thread blocked completely during parse
- Frame rate: 30-45fps during parsing
- User input queued, handled only after parsing completes

### Expected Behavior

- Parse time: 50-100ms (parallel execution)
- Main thread always available for UI
- Frame rate: 60fps maintained throughout
- User input responsive immediately

---

## Current Implementation

Markdown parsing happens synchronously on the main thread:

```typescript
// Current - blocks main thread
const html = marked.parse(content);
return <div>{html}</div>;
```

---

## Solution

Move markdown parsing to a Web Worker, freeing the main thread for user interactions.

**Security Note**: All HTML is sanitized with DOMPurify before rendering to prevent XSS attacks.

### Step 1: Create Web Worker

**File**: `public/workers/markdown-parser.worker.ts`

```typescript
/// <reference lib="webworker" />

import { marked } from 'marked';
import DOMPurify from 'dompurify';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';

export interface ParseRequest {
  id: string;
  content: string;
  options?: {
    highlightCode?: boolean;
    sanitize?: boolean;
  };
}

export interface ParseResponse {
  id: string;
  html: string;
  duration: number;
  error?: string;
}

// Configure marked with syntax highlighting
marked.setOptions({
  gfm: true,
  breaks: true,
  highlight: (code, lang) => {
    if (lang && Prism.languages[lang]) {
      try {
        return Prism.highlight(code, Prism.languages[lang], lang);
      } catch {
        // Fallback to unhighlighted
      }
    }
    return code;
  },
});

self.onmessage = async (event: MessageEvent<ParseRequest>) => {
  const start = performance.now();

  try {
    const { id, content, options } = event.data;

    // Parse markdown to HTML
    let html = await marked.parse(content);

    // SECURITY: Always sanitize with DOMPurify (default: true)
    if (options?.sanitize !== false) {
      html = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'code', 'pre', 'blockquote',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li', 'a', 'img', 'table', 'thead', 'tbody',
          'tr', 'th', 'td', 'span', 'div',
        ],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel'],
      });
    }

    const response: ParseResponse = {
      id,
      html,
      duration: performance.now() - start,
    };

    self.postMessage(response);
  } catch (error) {
    const response: ParseResponse = {
      id: event.data.id,
      html: '<p>Error parsing markdown</p>',
      duration: performance.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    self.postMessage(response);
  }
};
```

### Step 2: Create Worker Manager

**File**: `apps/web/src/lib/markdown-worker.ts`

```typescript
import type { ParseRequest, ParseResponse } from '@/types/markdown';

export class MarkdownWorker {
  private worker: Worker | null = null;
  private pendingRequests = new Map<
    string,
    {
      resolve: (response: ParseResponse) => void;
      reject: (error: Error) => void;
    }
  >();
  private requestId = 0;

  constructor() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(
        new URL('/workers/markdown-parser.worker.js', import.meta.url)
      );

      this.worker.onmessage = (event: MessageEvent<ParseResponse>) => {
        const { id } = event.data;
        const pending = this.pendingRequests.get(id);

        if (pending) {
          this.pendingRequests.delete(id);

          if (event.data.error) {
            pending.reject(new Error(event.data.error));
          } else {
            pending.resolve(event.data);
          }
        }
      };

      this.worker.onerror = () => {
        // Reject all pending on worker crash
        this.pendingRequests.forEach(({ reject }) => {
          reject(new Error('Worker crashed'));
        });
        this.pendingRequests.clear();
      };
    }
  }

  /**
   * Parse markdown content in worker
   */
  parse(content: string): Promise<ParseResponse> {
    // Fallback for SSR or no Worker support
    if (!this.worker) {
      return this.fallbackParse(content);
    }

    return new Promise((resolve, reject) => {
      const id = `req-${++this.requestId}`;

      this.pendingRequests.set(id, { resolve, reject });

      this.worker!.postMessage({
        id,
        content,
        options: { highlightCode: true, sanitize: true },
      } satisfies ParseRequest);

      // Timeout after 5 seconds
      setTimeout(() => {
        const pending = this.pendingRequests.get(id);
        if (pending) {
          this.pendingRequests.delete(id);
          pending.reject(new Error('Parse timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Fallback for environments without Worker support
   */
  private async fallbackParse(content: string): Promise<ParseResponse> {
    const start = performance.now();
    const { marked } = await import('marked');
    const DOMPurify = (await import('dompurify')).default;

    let html = await marked.parse(content);
    html = DOMPurify.sanitize(html);

    return {
      id: 'fallback',
      html,
      duration: performance.now() - start,
    };
  }

  /**
   * Cleanup worker
   */
  destroy(): void {
    this.worker?.terminate();
    this.pendingRequests.clear();
  }
}

// Singleton instance
let instance: MarkdownWorker | null = null;

export function getMarkdownWorker(): MarkdownWorker {
  if (!instance) {
    instance = new MarkdownWorker();
  }
  return instance;
}
```

### Step 3: Create React Hook

**File**: `apps/web/src/hooks/useParsedMarkdown.ts`

```typescript
import { useState, useEffect, useRef } from 'react';
import { getMarkdownWorker } from '@/lib/markdown-worker';

interface UseParsedMarkdownResult {
  html: string;
  isParsing: boolean;
  parseTime: number;
  error: string | null;
}

export function useParsedMarkdown(content: string): UseParsedMarkdownResult {
  const [html, setHtml] = useState('<p></p>');
  const [isParsing, setIsParsing] = useState(true);
  const [parseTime, setParseTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const parse = async () => {
      if (!content) {
        setHtml('<p></p>');
        setIsParsing(false);
        return;
      }

      setIsParsing(true);
      setError(null);

      try {
        const worker = getMarkdownWorker();
        const result = await worker.parse(content);

        if (mountedRef.current) {
          setHtml(result.html);
          setParseTime(result.duration);
          setIsParsing(false);
        }
      } catch (err) {
        if (mountedRef.current) {
          const message = err instanceof Error ? err.message : 'Parse failed';
          setError(message);
          setHtml(`<p>Error: ${message}</p>`);
          setIsParsing(false);
        }
      }
    };

    parse();

    return () => {
      mountedRef.current = false;
    };
  }, [content]);

  return { html, isParsing, parseTime, error };
}
```

### Step 4: Integrate with Message Component

**File**: `apps/web/src/components/chat/MessageContent.tsx`

```typescript
import { useParsedMarkdown } from '@/hooks/useParsedMarkdown';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface MessageContentProps {
  content: string;
  isStreaming?: boolean;
}

export function MessageContent({ content, isStreaming }: MessageContentProps) {
  const { html, isParsing, parseTime } = useParsedMarkdown(content);

  // Show loading only for slow parses (>100ms)
  if (isParsing && parseTime > 100) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Spinner size="sm" />
        <span className="text-sm">Rendering...</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none',
        isStreaming && 'animate-pulse'
      )}
      // SECURITY: HTML is sanitized by DOMPurify in the worker
      // This is safe as long as sanitization is enforced
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

### Step 5: Add Result Caching

**File**: `apps/web/src/lib/markdown-cache.ts`

```typescript
interface CacheEntry {
  html: string;
  timestamp: number;
}

class MarkdownCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 200;
  private maxAge = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate cache key from content hash
   */
  private getKey(content: string): string {
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `md-${hash}`;
  }

  get(content: string): string | null {
    const key = this.getKey(content);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry.html;
  }

  set(content: string, html: string): void {
    // LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    const key = this.getKey(content);
    this.cache.set(key, { html, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const markdownCache = new MarkdownCache();
```

---

## Testing

### Unit Tests

```typescript
describe('MarkdownWorker', () => {
  it('should parse markdown in worker', async () => {
    const worker = getMarkdownWorker();

    const result = await worker.parse('# Hello\n\n**World**');

    expect(result.html).toContain('<h1>Hello</h1>');
    expect(result.html).toContain('<strong>World</strong>');
    expect(result.duration).toBeGreaterThan(0);
  });

  it('should sanitize HTML output', async () => {
    const worker = getMarkdownWorker();

    const result = await worker.parse('<script>alert("xss")</script>');

    expect(result.html).not.toContain('<script>');
    expect(result.html).not.toContain('alert');
  });

  it('should highlight code blocks', async () => {
    const worker = getMarkdownWorker();

    const result = await worker.parse('```typescript\nconst x = 1;\n```');

    expect(result.html).toContain('language-typescript');
  });

  it('should handle timeout gracefully', async () => {
    const worker = getMarkdownWorker();

    // Mock slow response
    jest.useFakeTimers();

    const promise = worker.parse('# Test');
    jest.advanceTimersByTime(6000);

    await expect(promise).rejects.toThrow('Parse timeout');

    jest.useRealTimers();
  });
});

describe('useParsedMarkdown', () => {
  it('should return parsed HTML', async () => {
    const { result } = renderHook(() => useParsedMarkdown('# Hello'));

    await waitFor(() => {
      expect(result.current.isParsing).toBe(false);
    });

    expect(result.current.html).toContain('<h1>Hello</h1>');
    expect(result.current.error).toBeNull();
  });

  it('should handle empty content', () => {
    const { result } = renderHook(() => useParsedMarkdown(''));

    expect(result.current.html).toBe('<p></p>');
    expect(result.current.isParsing).toBe(false);
  });
});
```

### Performance Test

```typescript
describe('Worker Performance', () => {
  it('should maintain 60fps during large message parsing', async () => {
    const fpsMeasurements: number[] = [];
    let lastTime = performance.now();

    const measureFps = () => {
      const now = performance.now();
      const fps = 1000 / (now - lastTime);
      fpsMeasurements.push(fps);
      lastTime = now;
    };

    // Start measuring
    const interval = setInterval(measureFps, 16);

    // Parse large content
    const worker = getMarkdownWorker();
    const largeContent = '# Heading\n\n'.repeat(1000);
    await worker.parse(largeContent);

    clearInterval(interval);

    // Verify FPS stayed above 55
    const minFps = Math.min(...fpsMeasurements.filter((f) => f < 100));
    expect(minFps).toBeGreaterThan(55);
  });
});
```

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Parse time (perceived) | 450ms blocked | 5ms (post to worker) | 99% reduction |
| Frame rate during parse | 30-45fps | 60fps | 33-100% improvement |
| User input latency | 500ms | 16ms | 97% reduction |
| Main thread availability | 0% during parse | 100% | Always responsive |
| Memory overhead | N/A | ~6MB | Acceptable |

---

## Risk Assessment

- **Risk Level**: LOW
- **Breaking Changes**: None (fallback for no Worker support)
- **Browser Support**: 95%+ (IE11 excluded)
- **Security**: DOMPurify sanitization prevents XSS
- **Testing Required**: Moderate (async behavior)

---

## References

- **Sources**: kimi/06-performance/03-web-worker-markdown.md, IMPLEMENTATION-SPECIFICATION.md
- **Web Workers**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
- **DOMPurify**: https://github.com/cure53/DOMPurify
- **Related Issues**: P8-performance/01-virtualization.md, P8-performance/02-object-pooling.md
