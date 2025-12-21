# Web Worker Syntax Highlighting Implementation

## Context

This document details the implementation plan for offloading syntax highlighting to web workers.

**Why Web Workers:**
- Code blocks appear in >50% of conversations
- Typical conversation length: >100 messages
- Synchronous Shiki initialization blocks main thread (~200KB bundle)
- Large code blocks can freeze UI during highlighting
- Priority: Both fast initial load AND smooth streaming

**Current Bottlenecks:**
- Shiki init happens synchronously on first code block
- Highlighting runs on main thread (blocking)
- ~15 languages pre-loaded (~200KB bundle)
- Though `requestIdleCallback` defers work, large blocks still impact responsiveness

**Expected Benefits:**
- Unblocked main thread during highlighting
- Smoother streaming with code blocks
- Better perceived performance
- No UI freezing on large code snippets

---

## Architecture

### Worker + Manager Pattern

```
┌─────────────┐         ┌──────────────────┐         ┌──────────────┐
│  CodeBlock  │ ────────> │  HighlighterMgr │ ────────> │   Worker(s) │
│  Component  │ <──────── │                  │ <──────── │             │
└─────────────┘         └──────────────────┘         └──────────────┘
    Request                   Queue/Pool                  Shiki
    Callback                  Management                  Engine
```

**Components:**
1. **Worker** (`highlighter.worker.ts`): Runs Shiki in isolated thread
2. **Manager** (`highlighterWorker.ts`): Request queue, worker pool, lifecycle
3. **Component** (`CodeBlock.tsx`): Updated to use worker API
4. **Config** (`next.config.ts`): Enable worker bundling

---

## Implementation Steps

### Step 1: Create Worker Implementation

**File:** `src/lib/highlighter.worker.ts`

```typescript
import {
  createHighlighterCore,
  type LanguageInput,
  type ThemeInput,
} from "shiki/core";
import getWasm from "shiki/wasm";

let highlighterPromise: Promise<Awaited<ReturnType<typeof createHighlighterCore>>> | null = null;

// Message types
type HighlightRequest = {
  type: "highlight";
  id: string;
  code: string;
  language: string;
};

type HighlightResponse = {
  type: "result";
  id: string;
  html: string;
};

type ErrorResponse = {
  type: "error";
  id: string;
  error: string;
};

// Initialize highlighter lazily
async function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const [
        jsLang,
        tsLang,
        jsxLang,
        tsxLang,
        jsonLang,
        pythonLang,
        rustLang,
        goLang,
        javaLang,
        cppLang,
        cLang,
        shellLang,
        sqlLang,
        htmlLang,
        cssLang,
        rosePineTheme,
      ] = await Promise.all([
        import("shiki/langs/javascript.mjs"),
        import("shiki/langs/typescript.mjs"),
        import("shiki/langs/jsx.mjs"),
        import("shiki/langs/tsx.mjs"),
        import("shiki/langs/json.mjs"),
        import("shiki/langs/python.mjs"),
        import("shiki/langs/rust.mjs"),
        import("shiki/langs/go.mjs"),
        import("shiki/langs/java.mjs"),
        import("shiki/langs/cpp.mjs"),
        import("shiki/langs/c.mjs"),
        import("shiki/langs/shellscript.mjs"),
        import("shiki/langs/sql.mjs"),
        import("shiki/langs/html.mjs"),
        import("shiki/langs/css.mjs"),
        import("shiki/themes/rose-pine.mjs"),
      ]);

      return await createHighlighterCore({
        themes: [rosePineTheme.default as ThemeInput],
        langs: [
          jsLang.default as LanguageInput,
          tsLang.default as LanguageInput,
          jsxLang.default as LanguageInput,
          tsxLang.default as LanguageInput,
          jsonLang.default as LanguageInput,
          pythonLang.default as LanguageInput,
          rustLang.default as LanguageInput,
          goLang.default as LanguageInput,
          javaLang.default as LanguageInput,
          cppLang.default as LanguageInput,
          cLang.default as LanguageInput,
          shellLang.default as LanguageInput,
          sqlLang.default as LanguageInput,
          htmlLang.default as LanguageInput,
          cssLang.default as LanguageInput,
        ],
        loadWasm: getWasm,
      });
    })();
  }
  return highlighterPromise;
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<HighlightRequest>) => {
  const { type, id, code, language } = event.data;

  if (type !== "highlight") {
    return;
  }

  try {
    const highlighter = await getHighlighter();
    const html = highlighter.codeToHtml(code, {
      lang: language,
      theme: "rose-pine",
    });

    const response: HighlightResponse = {
      type: "result",
      id,
      html,
    };

    self.postMessage(response);
  } catch (error) {
    const errorResponse: ErrorResponse = {
      type: "error",
      id,
      error: error instanceof Error ? error.message : "Unknown error",
    };

    self.postMessage(errorResponse);
  }
};

// Signal ready
self.postMessage({ type: "ready" });
```

---

### Step 2: Create Worker Manager

**File:** `src/lib/highlighterWorker.ts`

```typescript
type HighlightCallback = (html: string) => void;
type ErrorCallback = (error: string) => void;

interface PendingRequest {
  resolve: HighlightCallback;
  reject: ErrorCallback;
}

class HighlighterWorkerManager {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private requestCounter = 0;
  private isReady = false;
  private readyQueue: Array<() => void> = [];

  constructor() {
    if (typeof window !== "undefined") {
      this.initWorker();
    }
  }

  private initWorker() {
    try {
      this.worker = new Worker(
        new URL("./highlighter.worker.ts", import.meta.url),
        { type: "module" }
      );

      this.worker.onmessage = (event) => {
        const { type, id, html, error } = event.data;

        if (type === "ready") {
          this.isReady = true;
          // Process queued requests
          this.readyQueue.forEach((fn) => fn());
          this.readyQueue = [];
          return;
        }

        const pending = this.pendingRequests.get(id);
        if (!pending) return;

        if (type === "result") {
          pending.resolve(html);
        } else if (type === "error") {
          pending.reject(error);
        }

        this.pendingRequests.delete(id);
      };

      this.worker.onerror = (error) => {
        console.error("Worker error:", error);
        // Reject all pending requests
        this.pendingRequests.forEach((pending) => {
          pending.reject("Worker crashed");
        });
        this.pendingRequests.clear();
      };
    } catch (error) {
      console.error("Failed to initialize worker:", error);
    }
  }

  public async highlight(code: string, language: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const executeHighlight = () => {
        if (!this.worker) {
          reject("Worker not available");
          return;
        }

        const id = `${++this.requestCounter}`;
        this.pendingRequests.set(id, { resolve, reject });

        this.worker.postMessage({
          type: "highlight",
          id,
          code,
          language,
        });

        // Timeout after 10s
        setTimeout(() => {
          if (this.pendingRequests.has(id)) {
            this.pendingRequests.delete(id);
            reject("Highlight timeout");
          }
        }, 10000);
      };

      if (this.isReady) {
        executeHighlight();
      } else {
        this.readyQueue.push(executeHighlight);
      }
    });
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
    this.readyQueue = [];
    this.isReady = false;
  }
}

// Singleton instance
let highlighterManager: HighlighterWorkerManager | null = null;

export function getHighlighterWorker(): HighlighterWorkerManager {
  if (!highlighterManager) {
    highlighterManager = new HighlighterWorkerManager();
  }
  return highlighterManager;
}

export function terminateHighlighterWorker() {
  if (highlighterManager) {
    highlighterManager.terminate();
    highlighterManager = null;
  }
}
```

---

### Step 3: Update CodeBlock Component

**File:** `src/components/chat/CodeBlock.tsx`

**Changes needed:**
1. Import worker manager instead of direct highlighter
2. Update `highlightCode` to use worker
3. Add error handling/fallback

```typescript
import { getHighlighterWorker } from "@/lib/highlighterWorker";

// Inside CodeBlock component:
useEffect(() => {
  const highlight = async () => {
    if (!code || !language) {
      setHighlightedCode(code);
      return;
    }

    try {
      const worker = getHighlighterWorker();
      const html = await worker.highlight(code, language);
      setHighlightedCode(html);
    } catch (error) {
      console.error("Highlighting failed:", error);
      // Fallback: show plain code
      setHighlightedCode(`<pre><code>${escapeHtml(code)}</code></pre>`);
    }
  };

  // Use requestIdleCallback for non-critical highlighting
  if ("requestIdleCallback" in window) {
    const handle = requestIdleCallback(() => highlight());
    return () => cancelIdleCallback(handle);
  } else {
    highlight();
  }
}, [code, language]);

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
```

---

### Step 4: Next.js Configuration

**File:** `next.config.ts`

Ensure webpack is configured to handle worker imports:

```typescript
const nextConfig: NextConfig = {
  // ... existing config

  webpack: (config, { isServer }) => {
    // Don't bundle workers on server-side
    if (!isServer) {
      config.output.globalObject = "self";
    }
    return config;
  },
};
```

---

## Integration Points

### 1. CodeBlock.tsx
- **Current**: Calls `highlighter.codeToHtml()` directly
- **New**: Calls `getHighlighterWorker().highlight()`
- **Fallback**: Plain `<pre><code>` if worker fails

### 2. highlighter.ts
- **Current**: Exports `getHighlighter()` and `highlightCode()`
- **New**: Keep for SSR/fallback, add worker path
- **Decision**: Keep both implementations (worker preferred, sync fallback)

### 3. Browser Support
- **Worker support**: Check `typeof Worker !== "undefined"`
- **Fallback**: Use synchronous highlighter.ts
- **Safari**: Full support (since iOS 10)

---

## Testing Strategy

### Performance Validation

**Measure before/after:**
```typescript
// In CodeBlock.tsx
const start = performance.now();
const html = await worker.highlight(code, language);
const duration = performance.now() - start;
console.log(`Highlight took ${duration}ms (worker)`);
```

**Metrics to track:**
- Time to first highlight (cold start)
- Average highlight time per block
- Main thread blocking time (should be ~0ms)
- Memory usage (worker overhead)

**Test scenarios:**
1. Small code block (10 lines) - baseline overhead
2. Large code block (500 lines) - blocking test
3. Multiple rapid blocks - queue handling
4. Streaming with code - smoothness check

### Functional Tests

**Manual testing:**
- [ ] Code blocks render correctly
- [ ] Theme applied properly
- [ ] Line numbers if implemented
- [ ] Copy button works
- [ ] Fallback works without Worker support
- [ ] No console errors
- [ ] Syntax highlighting accurate

**Conversation scenarios:**
- [ ] Single code block
- [ ] Multiple blocks in one message
- [ ] Code blocks while streaming
- [ ] 100+ message conversation with code
- [ ] Fast model switching with code visible

---

## Rollback Plan

### Feature Flag Approach

**Environment variable:**
```bash
NEXT_PUBLIC_USE_WORKER_HIGHLIGHTING=false
```

**In CodeBlock.tsx:**
```typescript
const useWorker =
  process.env.NEXT_PUBLIC_USE_WORKER_HIGHLIGHTING !== "false" &&
  typeof Worker !== "undefined";

if (useWorker) {
  // Worker path
  const worker = getHighlighterWorker();
  html = await worker.highlight(code, language);
} else {
  // Synchronous fallback
  const highlighter = await getHighlighter();
  html = highlighter.codeToHtml(code, { lang: language, theme });
}
```

**Rollback steps:**
1. Set env var to `false`
2. Redeploy
3. Monitor for issues
4. Remove worker code if needed

---

## Browser Compatibility

### Support Matrix

| Browser | Worker Support | Fallback Needed |
|---------|----------------|-----------------|
| Chrome 4+ | ✅ | No |
| Firefox 3.5+ | ✅ | No |
| Safari 4+ | ✅ | No |
| Edge 12+ | ✅ | No |
| IE 10+ | ✅ | No |

**Modern browser target:** 99%+ coverage

### Fallback Pattern

```typescript
function createHighlighter() {
  if (typeof Worker !== "undefined") {
    try {
      return new WorkerHighlighter();
    } catch (error) {
      console.warn("Worker init failed, using sync highlighter:", error);
      return new SyncHighlighter();
    }
  }
  return new SyncHighlighter();
}
```

---

## Alternative: Lazy Load Shiki (Simpler)

If web worker complexity is too high, consider lazy loading instead:

**File:** `src/lib/highlighter.ts`

```typescript
let highlighterPromise: Promise<Highlighter> | null = null;

export async function highlightCode(code: string, lang: string) {
  // Lazy init on first code block
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [rosePineTheme],
      langs: [/* ... */],
      loadWasm: getWasm,
    });
  }

  const highlighter = await highlighterPromise;
  return highlighter.codeToHtml(code, { lang, theme: "rose-pine" });
}
```

**Benefits:**
- No upfront 200KB load
- Simpler than worker (no message passing)
- Still async/non-blocking

**Drawbacks:**
- Still blocks main thread during highlighting
- Large blocks can freeze UI

---

## Decision Criteria

**Implement web worker if:**
- [ ] >20% of conversations have code blocks (✅ >50% in our case)
- [ ] Users report UI freezing with code
- [ ] Shiki init time >500ms on target devices
- [ ] Analytics show code block impact on streaming

**Use lazy loading if:**
- [ ] <20% of conversations have code
- [ ] Init time acceptable
- [ ] Simpler maintenance preferred

**Current recommendation:** **Implement web worker** (criteria met: >50% code usage, long conversations, priority on smoothness)

---

## Expected Impact

### Before
- Shiki loaded upfront: ~200KB bundle on initial load
- Highlighting blocks main thread: ~50-200ms per block
- Large blocks (500+ lines): noticeable freeze
- Streaming interrupted during highlighting

### After
- Shiki loaded on demand in worker: 0ms main thread impact
- Highlighting off main thread: main thread free
- Large blocks: UI stays responsive
- Smooth streaming even with code

### Performance Comparison

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Initial bundle | +200KB | +0KB | 100% |
| Main thread block | 50-200ms | ~0ms | ~100% |
| Large block (500 lines) | ~500ms freeze | 0ms freeze | 100% |
| Streaming smoothness | Interrupted | Smooth | Qualitative |

---

## Implementation Checklist

- [ ] Create `highlighter.worker.ts`
- [ ] Create `highlighterWorker.ts` manager
- [ ] Update `CodeBlock.tsx` to use worker
- [ ] Update `next.config.ts` webpack config
- [ ] Add feature flag for rollback
- [ ] Test highlighting accuracy
- [ ] Test performance (measure blocking time)
- [ ] Test fallback (disable Worker)
- [ ] Test with 100+ message conversation
- [ ] Test streaming with code blocks
- [ ] Verify no memory leaks
- [ ] Document in CLAUDE.md

---

## Notes

- Worker initialization is lazy (on first code block)
- Manager uses singleton pattern (one worker per session)
- Request queue handles rapid consecutive highlights
- 10s timeout prevents hung requests
- Worker termination on page unload (cleanup)
- SSR: worker not available, falls back to sync
- Development: HMR may require worker restart

---

## References

- [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [Shiki Documentation](https://shiki.style/)
- [Next.js Worker Configuration](https://nextjs.org/docs/app/api-reference/next-config-js/webpack)
- [Browser Compatibility](https://caniuse.com/webworkers)
