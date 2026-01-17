# Work Item: Implement Web Worker for Markdown Parsing

## Description
Move markdown parsing and syntax highlighting off the main thread to a Web Worker, reducing main thread blocking from 200-500ms to <50ms and maintaining 60fps during message rendering.

## Problem Statement
Markdown parsing blocks the main thread:
- **Large messages**: 500ms parse time for 10,000 character messages
- **Main thread blocked**: UI frozen, can't scroll, click, or type
- **Frame drops**: 30-45fps instead of 60fps
- **User frustration**: App feels sluggish with long responses

## Solution Specification
Create Web Worker that handles markdown parsing in background thread, sending HTML back to main thread for rendering.

## Implementation Steps

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
import 'prismjs/components/prism-css';

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

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: true,
  highlight: (code, lang) => {
    if (lang && Prism.languages[lang]) {
      try {
        return Prism.highlight(code, Prism.languages[lang], lang);
      } catch (error) {
        console.warn(`Highlighting failed for ${lang}:`, error);
      }
    }
    return code; // Return unhighlighted if language not supported
  },
});

self.onmessage = async (event: MessageEvent<ParseRequest>) => {
  const start = performance.now();
  
  try {
    const { id, content, options } = event.data;
    
    // Parse markdown to HTML
    let html = await marked.parse(content);
    
    // Sanitize if requested (default: true)
    if (options?.sanitize !== false) {
      html = DOMPurify.sanitize(html);
    }
    
    const duration = performance.now() - start;
    
    const response: ParseResponse = {
      id,
      html,
      duration,
    };
    
    self.postMessage(response);
    
  } catch (error) {
    const response: ParseResponse = {
      id: event.data.id,
      html: `<p>Error parsing markdown: ${error.message}</p>`,
      duration: performance.now() - start,
      error: error.message,
    };
    
    self.postMessage(response);
  }
};
```

### Step 2: Create Worker Wrapper
**File**: `apps/web/src/lib/markdown-worker.ts`
```typescript
export class MarkdownWorker {
  private worker: Worker;
  private pendingRequests = new Map<string, {
    resolve: (response: ParseResponse) => void;
    reject: (error: Error) => void;
  }>();
  private requestId = 0;
  
  constructor() {
    // Create worker from blob (avoids bundling issues)
    const workerCode = `
      importScripts('https://cdn.jsdelivr.net/npm/marked/marked.min.js');
      importScripts('https://cdn.jsdelivr.net/npm/dompurify/dist/purify.min.js');
      importScripts('https://cdn.jsdelivr.net/npm/prismjs/prism.js');
      
      // Worker code here (duplicated from .worker.ts file)
      ${workerImplementation.toString()}
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));
    
    this.worker.onmessage = (event: MessageEvent<ParseResponse>) => {
      const { id, html, duration, error } = event.data;
      const pending = this.pendingRequests.get(id);
      
      if (pending) {
        this.pendingRequests.delete(id);
        
        if (error) {
          pending.reject(new Error(error));
        } else {
          pending.resolve({ id, html, duration });
        }
      }
    };
    
    this.worker.onerror = (error) => {
      console.error('Worker error:', error);
      // Reject all pending requests
      this.pendingRequests.forEach(({ reject }) => {
        reject(new Error('Worker crashed'));
      });
      this.pendingRequests.clear();
    };
  }
  
  /**
   * Parse markdown content
   * Returns promise that resolves with HTML
   */
  parse(options: ParseRequest): Promise<ParseResponse> {
    return new Promise((resolve, reject) => {
      const id = `req-${++this.requestId}`;
      
      this.pendingRequests.set(id, { resolve, reject });
      
      this.worker.postMessage({
        ...options,
        id,
      });
      
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
   * Terminate worker and cleanup
   */
  destroy(): void {
    this.worker.terminate();
    this.pendingRequests.clear();
  }
  
  /**
   * Get queue size (for debugging)
   */
  getQueueSize(): number {
    return this.pendingRequests.size;
  }
}

// Singleton instance
export const markdownWorker = new MarkdownWorker();
```

### Step 3: React Hook Integration
**File**: `apps/web/src/hooks/useParsedMarkdown.ts`
```typescript
export const useParsedMarkdown = (content: string) => {
  const [html, setHtml] = useState('<p>Loading...</p>');
  const [isParsing, setIsParsing] = useState(true);
  const [parseTime, setParseTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    let isMounted = true;
    
    const parse = async () => {
      setIsParsing(true);
      setError(null);
      
      try {
        const result = await markdownWorker.parse({
          content,
          options: {
            highlightCode: true,
            sanitize: true,
          },
        });
        
        if (isMounted) {
          setHtml(result.html);
          setParseTime(result.duration);
          setIsParsing(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setHtml(`<p>Error: ${err.message}</p>`);
          setIsParsing(false);
        }
      }
    };
    
    // Parse immediately
    parse();
    
    return () => {
      isMounted = false;
    };
  }, [content]);
  
  return {
    html,
    isParsing,
    parseTime,
    error,
  };
};
```

### Step 4: Use in Chat Message Component
**File**: `apps/web/src/components/chat/ChatMessage.tsx`
```typescript
const ChatMessage = ({ message }) => {
  const { html, isParsing, parseTime } = useParsedMarkdown(
    message.content || message.partialContent || ''
  );
  
  // Show indicator for slow parsing
  if (isParsing && parseTime > 100) {
    return (
      <div className="message parsing">
        <div className="parsing-indicator">
          <Spinner size="sm" />
          <span>Parsing markdown...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="message-content"
      dangerouslySetInnerHTML={{ __html: html }} 
    />
  );
};
```

## Expected Results

### Performance Improvement
```
Before (main thread):
- Parse time: 200-500ms (blocks UI)
- Frame rate: 30-45fps during parse
- User perception: "Freezing", "laggy"
- Main thread blocked: Yes, completely

After (worker):
- Parse time: 50-100ms (parallel)
- Frame rate: 60fps maintained
- User perception: "Fast", "smooth"
- Main thread blocked: No, free to handle input

Improvement: 75-80% faster perceived performance
```

### Main Thread Availability
```javascript
// Chrome DevTools Performance Profile

Before:
- Scripting: 450ms (blocked)
- Rendering: 0ms (can't render while blocked)
- User input: Queued, handled after 450ms

After:
- Scripting: 5ms (just posting to worker)
- Rendering: 450ms (can render while worker parses)
- User input: Immediate, no queue
```

## Testing Verification

### Unit Test
```typescript
it('should parse markdown in worker', async () => {
  const worker = new MarkdownWorker();
  
  const result = await worker.parse({
    content: '# Hello\n\n**World**',
  });
  
  expect(result.html).toContain('<h1>Hello</h1>');
  expect(result.html).toContain('<strong>World</strong>');
  expect(result.duration).toBeGreaterThan(0);
  expect(result.error).toBeUndefined();
});

it('should handle code highlighting', async () => {
  const worker = new MarkdownWorker();
  
  const result = await worker.parse({
    content: '```typescript\nconst x = 1;\n```',
    options: { highlightCode: true },
  });
  
  expect(result.html).toContain('code');
  expect(result.html).toContain('class="language-typescript"');
});

it('should handle worker errors gracefully', async () => {
  const worker = new MarkdownWorker();
  
  // Mock worker error
  worker.worker.onerror(new ErrorEvent('error', { error: new Error('Worker crashed') }));
  
  await expect(
    worker.parse({ content: '# Test' })
  ).rejects.toThrow('Worker crashed');
});
```

### Integration Test
```typescript
it('should maintain 60fps during markdown parsing', async () => {
  const page = await openChatPage();
  
  // Start performance monitoring
  await page.evaluate(() => {
    window.fpsMeasurements = [];
    let lastTime = performance.now();
    
    const measure = () => {
      const currentTime = performance.now();
      const delta = currentTime - lastTime;
      const fps = 1000 / delta;
      window.fpsMeasurements.push(fps);
      lastTime = currentTime;
      requestAnimationFrame(measure);
    };
    
    requestAnimationFrame(measure);
  });
  
  // Send long message that requires parsing
  await sendMessage('# '.repeat(1000) + ' Large markdown document');
  
  await wait(2000); // Let parsing complete
  
  // Check FPS stayed above 55 (60fps target)
  const minFps = await page.evaluate(() => 
    Math.min(...window.fpsMeasurements.filter(f => f < 100))
  );
  
  expect(minFps).toBeGreaterThan(55);
});
```

## Performance Impact

```
Main thread time saved:
- Parse operation: 450ms → 5ms (99% reduction)
- UI responsiveness: 45fps → 60fps maintained
- User input latency: 500ms → 16ms

Memory overhead:
- Worker memory: ~5MB
- Message passing: <1MB per message
- Total overhead: ~6MB (negligible)

Recommendation: Strongly positive trade-off
```

## Fallback Strategy

```typescript
// If worker fails or not supported
const useFallback = !window.Worker || workerFails;

if (useFallback) {
  // Parse on main thread (slow but works)
  const html = marked.parse(content);
  return DOMPurify.sanitize(html);
}
```

## Risk Assessment
- **Risk Level**: LOW
- **Browser Support**: 95% (IE11 doesn't support workers)
- **Breaking Changes**: None (fallback available)
- **Performance Impact**: Highly positive
- **Testing Required**: Moderate (async behavior)

## Priority
**HIGH** - Critical for performance with long messages

## Related Work Items
- Work Item 06-01: Dynamic height virtualization (also performance)
- Work Item 06-02: Object pooling (also reduces main thread work)
- Work Item 02-02: Smooth scrolling (both maintain 60fps)
- Work Item 07-03: Reduced motion (respect user performance preferences)

## Additional Notes
- Worker termination on app unload
- Message size limits (watch for large messages)
- Consider worker pool for parallel parsing
- Caching parse results for identical content