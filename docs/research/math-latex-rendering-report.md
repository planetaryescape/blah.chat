# Math and LaTeX Rendering Research Report

**Date:** December 5, 2025
**Context:** Next.js 15 + React 19 + Tailwind CSS chat application
**Focus:** Real-time streaming chat with math/LaTeX support

---

## Executive Summary

For blah.chat's streaming chat interface, **KaTeX with Streamdown** is the recommended approach. This combination provides:
- Fast rendering performance for streaming contexts
- Built-in support for incomplete markdown chunks
- SSR compatibility with Next.js 15
- Small bundle size (~100KB with optimizations)
- Good-enough accessibility with MathML output

**Key Trade-off:** Choose KaTeX for speed and streaming reliability, understanding that you'll sacrifice some advanced accessibility features that MathJax provides.

---

## 1. Library Comparison: KaTeX vs MathJax

### Performance Metrics

| Feature | KaTeX | MathJax v3 |
|---------|-------|------------|
| **Speed** | Fastest - synchronous rendering | Comparable to KaTeX (v3), much faster than v2 |
| **Bundle Size** | ~200KB minified | Larger, more modular |
| **Rendering** | Pre-render ready, no reflow | Dynamic browser rendering |
| **NPM Downloads** | ~4.2M weekly | Lower than KaTeX |
| **GitHub Stars** | 19,595 | - |

### Key Differences

**KaTeX:**
- ✅ **Synchronous rendering** - no page reflow, flicker-free
- ✅ **SSR compatible** - produces same output in Node.js and browser
- ✅ **Pre-rendering** - can send plain HTML to client
- ✅ **Deterministic output** - same across all browsers/environments
- ⚠️ **Limited LaTeX support** - subset of LaTeX functions (but covers 95% of use cases)
- ⚠️ **Basic accessibility** - includes hidden MathML but not as robust as MathJax

**MathJax:**
- ✅ **Comprehensive LaTeX support** - supports most LaTeX functions
- ✅ **Multiple input formats** - LaTeX, MathML, AsciiMath
- ✅ **Multiple output formats** - HTML, SVG, MathML
- ✅ **Superior accessibility** - dedicated screen reader support, ARIA labels, exploration tools
- ⚠️ **Slower** - especially v2.7 (v3 is much improved)
- ⚠️ **Requires client-side processing** - not ideal for SSR

### Recommendation

> **"Choose MathQuill for editing, KaTeX for speed, and MathJax for comprehensiveness."**

For a chat application with streaming responses: **KaTeX wins** due to speed, SSR support, and deterministic rendering.

---

## 2. How Major AI Chat Applications Handle Math

### ChatGPT
- Uses **LaTeX rendering** with client-side JavaScript library (likely MathJax or KaTeX)
- Chrome extension available for enhanced rendering
- **Challenge noted:** "ChatGPT is really bad at understanding its own capabilities so you have to instruct it how to display LaTeX"
- Users often need specific prompts to get properly formatted output

### Claude.ai
- Added **LaTeX rendering** as a feature preview (August 2024)
- Uses **KaTeX** for rendering
- Displays mathematical equations and expressions in consistent format
- Optimized for conversational environments with real-time rendering
- Examples include: Gaussian integral, Basel problem solution, small-angle approximations

### Notion
- Uses **KaTeX** library
- Supports large subset of LaTeX functions
- **Delimiter:** Uses `$$...$$` (double dollar) instead of single `$` used by most Markdown implementations
- **Limitation:** Doesn't support `align` environment (use `aligned` instead)
- Inline: `/math` command or `$$` trigger

### Obsidian
- Uses **MathJax** library
- Native support for LaTeX math notation
- **Delimiters:**
  - Inline: `$...$`
  - Block: `$$...$$`
- Full-featured for academic/technical writing
- Better accessibility than KaTeX

### Key Takeaway

**KaTeX is the industry standard for chat applications** (Claude, Notion), while MathJax is preferred for academic/documentation tools (Obsidian). Chat contexts prioritize speed and streaming compatibility over comprehensive LaTeX support.

---

## 3. Best Practices for Implementation

### 3.1 Math Delimiter Detection

#### Standard Delimiters

| Type | Delimiter | Example | Notes |
|------|-----------|---------|-------|
| Inline | `$...$` | `$E = mc^2$` | Risk of false positives with currency |
| Inline (Safe) | `\(...\)` | `\(E = mc^2\)` | LaTeX standard, unambiguous |
| Block | `$$...$$` | `$$E = mc^2$$` | Most common |
| Block (Safe) | `\[...\]` | `\[E = mc^2\]` | LaTeX standard |

#### Recommended Approach

1. **Support both `$...$` and `\(...\)`** for inline math
2. **Use `$$...$$` and `\[...\]`** for display math
3. **Escape dollar signs** in non-math contexts: `\$`
4. **Use proper spacing** around delimiters to help parsers
5. **Prefer fenced code blocks** when available:
   ````
   ```math
   E = mc^2
   ```
   ````

#### Common Pitfalls

- **Currency conflicts:** "$5 and $10" might trigger false positives
- **Markdown preprocessing:** Underscores in math (`x_i`) getting converted to italics
- **Incomplete delimiters:** In streaming contexts, `$$` might arrive before closing `$$`

### 3.2 Integration with Markdown Pipeline

#### Standard Stack (react-markdown)

```jsx
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

<ReactMarkdown
  remarkPlugins={[remarkMath]}
  rehypePlugins={[rehypeKatex]}
>
  {markdown}
</ReactMarkdown>
```

**Installation:**
```bash
bun add react-markdown remark-math rehype-katex katex
```

**Critical:** Import KaTeX CSS for proper styling!

#### Next.js 15 + MDX (Nextra Pattern)

For static content with MDX:

```js
// next.config.mjs
export default {
  latex: true,  // Uses KaTeX by default
  // or
  latex: { renderer: 'mathjax' }  // Use MathJax instead
}
```

Nextra can **pre-render LaTeX** with KaTeX (faster page loads) or dynamically render with MathJax (broader support).

### 3.3 Streaming-Specific Considerations

#### Problem: Incomplete Markdown

When streaming AI responses token-by-token:
- Markdown syntax is incomplete during transmission
- `$$` delimiter might arrive before equation content
- Code blocks, lists, and math can be "unclosed"
- Traditional parsers fail or render incorrectly

#### Solution 1: Buffering + Memoization

```jsx
const renderedMarkdown = useMemo(() => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
    >
      {message}
    </ReactMarkdown>
  );
}, [message]);
```

**Performance issue:** Re-renders entire conversation on each token. Becomes exponentially worse with long conversations.

#### Solution 2: Streamdown (Recommended)

**Vercel's Streamdown** is purpose-built for AI streaming:

```jsx
import { Streamdown } from 'streamdown';

// With Vercel AI SDK
const { messages } = useChat();

return messages.map((m) => (
  <Streamdown key={m.id}>{m.content}</Streamdown>
));
```

**Key features:**
- ✅ Handles **incomplete/unterminated** Markdown gracefully
- ✅ **Built-in math support** - includes remarkMath + rehypeKatex
- ✅ **Built-in syntax highlighting** - bundles Shiki themes
- ✅ **Regex-based recovery** - fixes unclosed syntax elements automatically
- ✅ **Optimized for streaming** - doesn't re-parse completed blocks
- ✅ **Drop-in replacement** for react-markdown

**Installation:**
```bash
bun add streamdown
# or via AI Elements
bunx ai-elements add response
```

**Why it works:**
> "Streamdown buffers incoming tokens and applies regex-based recovery rules to detect and fix unclosed syntax elements. The `parseIncompleteMarkdown` prop enables this behavior by default."

**Performance comparison:**
- react-markdown: Re-renders all content on each token → O(n²) complexity
- Streamdown: Memoizes completed blocks → Only renders new content

### 3.4 Server-Side Rendering (SSR)

#### KaTeX SSR Support

KaTeX is **perfect for SSR**:

```js
import katex from 'katex';

// Server-side rendering
const html = katex.renderToString('E = mc^2', {
  throwOnError: false,
  output: 'htmlAndMathml'  // Includes MathML for accessibility
});

// Send pre-rendered HTML to client - no client-side JS needed!
```

**Benefits:**
- No client-side reflow
- Faster perceived load time
- Works without JavaScript
- Consistent across browsers

#### Next.js 15 Server Components

```tsx
// app/components/MathBlock.tsx (Server Component by default)
import katex from 'katex';
import 'katex/dist/katex.min.css';

export function MathBlock({ latex }: { latex: string }) {
  const html = katex.renderToString(latex, {
    throwOnError: false,
    displayMode: true
  });

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

**For interactive/streaming components:**
```tsx
'use client';  // Client component for streaming

import { Streamdown } from 'streamdown';

export function StreamingMessage({ content }: { content: string }) {
  return <Streamdown>{content}</Streamdown>;
}
```

**Architecture:**
- Static math equations → Server Components (pre-render with KaTeX)
- Streaming responses → Client Components (Streamdown)

### 3.5 Performance Optimization

#### Bundle Size Optimization

**KaTeX size concerns:**
> "Over 200KB minified!" - but this is the full library

**Optimization strategies:**

1. **Lazy loading:**
```jsx
const KaTeX = lazy(() => import('./components/MathRenderer'));

// Only load when math is present
{hasmath && <Suspense fallback={<Skeleton />}><KaTeX /></Suspense>}
```

2. **Tree shaking:**
```js
// next.config.js
export default {
  webpack: (config) => {
    config.optimization.usedExports = true;
    return config;
  }
}
```

3. **Dynamic imports:**
```jsx
// Only load katex.css when needed
useEffect(() => {
  if (hasMath) {
    import('katex/dist/katex.min.css');
  }
}, [hasMath]);
```

4. **CDN for CSS:**
```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
/>
```

**Bundle analysis tools:**
- `webpack-bundle-analyzer` - visual treemap of bundle
- Bundlephobia.com - cost analysis for npm packages

#### Mobile Performance

**Key consideration:** 200KB on 3G = ~3 second download

**Strategies:**
1. **Server-side rendering** - send pre-rendered HTML
2. **Progressive enhancement** - show raw LaTeX while KaTeX loads
3. **Code splitting** - separate math rendering from main bundle
4. **Throttle updates** - don't render every token

**Experimental throttling:**
```jsx
const { messages } = useChat({
  experimental_throttle: 100  // Update every 100ms, not every token
});
```

### 3.6 Accessibility

#### KaTeX's Accessibility Story

**What KaTeX provides:**
- Hidden MathML output (via `output: 'htmlAndMathml'`)
- Screen readers can access mathematical structure
- Works with VoiceOver (iOS/macOS) ✅

**Known limitations:**
- NVDA/JAWS support is limited
- Some screen readers don't see hidden MathML
- Not as robust as MathJax's dedicated a11y features

**Testing results:**
> "NVDA shows that the KaTeX website's rendered math isn't seen by the screen reader, not even character-by-character."

#### Best Practices for Accessibility

1. **Use `htmlAndMathml` output mode:**
```js
katex.render(latex, element, {
  output: 'htmlAndMathml'  // Default in KaTeX
});
```

2. **Add ARIA labels for complex equations:**
```jsx
<div role="math" aria-label="E equals m c squared">
  {/* KaTeX rendered output */}
</div>
```

3. **Provide text alternatives:**
```jsx
<figure>
  <div className="math-display">
    {/* Rendered math */}
  </div>
  <figcaption className="sr-only">
    Equation: E equals mass times the speed of light squared
  </figcaption>
</figure>
```

4. **Test with screen readers:**
   - VoiceOver (macOS/iOS) - best support
   - NVDA (Windows) - limited support
   - JAWS (Windows) - limited support

#### MathJax Alternative for Accessibility

If accessibility is critical:

```jsx
// MathJax v4 with full accessibility
import { MathJax, MathJaxContext } from 'better-react-mathjax';

<MathJaxContext>
  <MathJax>
    {"$$E = mc^2$$"}
  </MathJax>
</MathJaxContext>
```

MathJax provides:
- `a11y/explorer` - keyboard navigation of equations
- `a11y/speech` - generates speech strings
- `aria-label` and `aria-braillelabel` attributes
- Better NVDA/JAWS support

**Trade-off:** Slower rendering, larger bundle, not ideal for SSR.

---

## 4. Common Challenges and Solutions

### 4.1 Malformed LaTeX Handling

#### The Problem

Users (and LLMs!) make LaTeX mistakes:
- Missing closing delimiters: `$$x = 5`
- Invalid commands: `\frac{1}{2{3}`
- Unsupported functions
- Double subscripts: `a_b_c` (should be `a_{b_c}`)

#### KaTeX Error Handling

By default, KaTeX throws `ParseError`:

```js
try {
  katex.render(latex, element);
} catch (e) {
  if (e instanceof katex.ParseError) {
    // Display error to user
    element.textContent = `Math Error: ${e.message}`;
    element.style.color = 'red';
  }
}
```

**Better approach:** Graceful fallback

```js
katex.render(latex, element, {
  throwOnError: false,  // Don't throw, render error inline
  errorColor: '#cc0000',  // Red error text
  displayMode: true
});
```

**Result:** Invalid LaTeX is highlighted in red but doesn't break the page.

#### Error Display Strategy

1. **Development:** Show full error messages
2. **Production:** Show simplified errors + original source

```jsx
function MathRenderer({ latex }: { latex: string }) {
  try {
    const html = katex.renderToString(latex, {
      throwOnError: true,
      output: 'htmlAndMathml'
    });
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  } catch (e) {
    if (e instanceof katex.ParseError) {
      return (
        <div className="math-error">
          <span className="error-icon">⚠️</span>
          <code className="latex-source">{latex}</code>
          {process.env.NODE_ENV === 'development' && (
            <span className="error-message">{e.message}</span>
          )}
        </div>
      );
    }
    throw e;
  }
}
```

#### Common LaTeX Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Double subscript | `a_b_c` | Use `a_{b_c}` |
| Missing braces | `\frac12` | Use `\frac{1}{2}` |
| Unsupported command | `\align` | Use `\aligned` instead |
| Unmatched delimiters | `$$x = 5` | Add closing `$$` |

### 4.2 Markdown Preprocessing Conflicts

#### Problem: Underscores Become Italics

Markdown sees `$x_i + y_i$` and processes it as:
```html
$x<em>i + y</em>i$
```

MathJax/KaTeX can't parse HTML tags, so rendering fails.

#### Solutions

1. **Parse math BEFORE Markdown:**
```jsx
// remark-math runs before Markdown processing
<ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]}>
```

Order matters! Math plugin must run first.

2. **Use code spans (temporary protection):**
```markdown
`$x_i + y_i$`
```

But this prevents math rendering. Only useful for showing LaTeX source.

3. **Escape underscores:**
```markdown
$x\_i + y\_i$  // Not ideal, breaks LaTeX
```

4. **Use LaTeX delimiters:**
```markdown
\(x_i + y_i\)  // Markdown won't touch it
```

### 4.3 Copy/Paste Behavior

#### Challenge

When users copy rendered math, what should the clipboard contain?
- Visual rendering? (image)
- HTML markup?
- Raw LaTeX source? ✅ (preferred for reproducibility)

#### KaTeX's Default Behavior

KaTeX includes hidden `<annotation>` tags with original LaTeX:

```html
<span class="katex">
  <span class="katex-mathml">
    <math>
      <semantics>
        <annotation encoding="application/x-tex">E = mc^2</annotation>
      </semantics>
    </math>
  </span>
  <span class="katex-html">...</span>
</span>
```

**When users copy:** They get rendered text, but screen readers get LaTeX source.

#### Enhanced Copy/Paste

For better UX, add custom copy handler:

```jsx
function MathBlock({ latex }: { latex: string }) {
  const handleCopy = (e: ClipboardEvent) => {
    e.preventDefault();
    e.clipboardData?.setData('text/plain', `$$${latex}$$`);
    e.clipboardData?.setData('text/html', e.currentTarget.innerHTML);
  };

  return (
    <div
      className="math-block"
      onCopy={handleCopy}
      data-latex={latex}  // Store original for reference
    >
      {/* Rendered KaTeX */}
    </div>
  );
}
```

**Result:**
- Plain text: `$$E = mc^2$$` (can paste into LaTeX editor)
- HTML: Rendered equation (can paste into rich text editor)

### 4.4 Streaming Incomplete Delimiters

#### Problem

When streaming token-by-token:
1. `"The equation is $` ← Incomplete!
2. `"The equation is $$E = mc` ← Still incomplete!
3. `"The equation is $$E = mc^2$` ← Almost there...
4. `"The equation is $$E = mc^2$$"` ← Complete!

Traditional parsers fail at steps 1-3.

#### Solution: Streamdown's Recovery Rules

Streamdown applies regex-based detection:

```js
// Pseudo-code of Streamdown's logic
function parseIncompleteMarkdown(text) {
  // Detect unclosed math
  if (/\$\$[^$]*$/.test(text)) {
    return {
      type: 'incomplete-math',
      content: extractMathContent(text),
      display: true
    };
  }

  // Detect unclosed inline math
  if (/\$[^$]*$/.test(text)) {
    return {
      type: 'incomplete-math',
      content: extractMathContent(text),
      display: false
    };
  }

  // Render as-is
  return { type: 'text', content: text };
}
```

**Rendering strategy:**
- Incomplete math: Show raw text or loading indicator
- Complete math: Render with KaTeX

**User experience:**
```
Step 1: "The equation is $"         → Shows: "The equation is $"
Step 2: "The equation is $$E = mc"  → Shows: "The equation is $$E = mc"
Step 3: "The equation is $$E = mc^2$$" → Shows: Rendered equation
```

No flickering or broken rendering!

### 4.5 Mobile Rendering Performance

#### Challenges

- Limited CPU/GPU on mobile devices
- Smaller viewports (overflow issues)
- Touch interactions (zoom, scroll)
- High DPI screens (rendering complexity)

#### Optimization Strategies

1. **Use KaTeX over MathJax** - 3-5x faster
2. **Server-side render** - offload computation
3. **Lazy render** - only render visible equations

```jsx
import { useInView } from 'react-intersection-observer';

function MathBlock({ latex }: { latex: string }) {
  const { ref, inView } = useInView({
    triggerOnce: true,  // Only render once when in view
    rootMargin: '200px'  // Start rendering 200px before visible
  });

  return (
    <div ref={ref}>
      {inView ? (
        <KaTeXRenderer latex={latex} />
      ) : (
        <div className="math-placeholder">Loading math...</div>
      )}
    </div>
  );
}
```

4. **Responsive font sizes:**

```css
.katex {
  font-size: clamp(0.9rem, 2vw, 1.2rem);
}

@media (max-width: 640px) {
  .katex-display {
    overflow-x: auto;  /* Allow horizontal scroll */
    -webkit-overflow-scrolling: touch;
  }
}
```

5. **Simplify complex equations on mobile:**

```jsx
const isMobile = useMediaQuery('(max-width: 640px)');

<MathRenderer
  latex={isMobile ? simplifiedLatex : fullLatex}
/>
```

---

## 5. Specific Recommendations for blah.chat

### Architecture Overview

Given your requirements:
- ✅ Next.js 15 with App Router
- ✅ React 19
- ✅ Real-time streaming from Convex
- ✅ SSR with Server Components
- ✅ Resilient generation (survives page refresh)

### Recommended Stack

```
User types message
    ↓
Convex mutation (DB insert)
    ↓
Convex action (LLM streaming)
    ↓
Periodic DB updates (partialContent)
    ↓
Client subscription (reactive query)
    ↓
Streamdown rendering (math + markdown)
```

### Implementation Plan

#### Phase 1: Install Dependencies

```bash
bun add streamdown katex
bun add -D @types/katex
```

#### Phase 2: Create Math-Aware Message Renderer

```tsx
// src/components/chat/MessageContent.tsx
'use client';

import { Streamdown } from 'streamdown';
import 'katex/dist/katex.min.css';

interface MessageContentProps {
  content: string;
  status: 'pending' | 'generating' | 'complete' | 'error';
}

export function MessageContent({ content, status }: MessageContentProps) {
  // Show loading state for pending
  if (status === 'pending' && !content) {
    return <MessageSkeleton />;
  }

  // Show error state
  if (status === 'error') {
    return <ErrorMessage content={content} />;
  }

  // Render with Streamdown (handles incomplete markdown + math)
  return (
    <div className="message-content prose dark:prose-invert">
      <Streamdown
        className="streamdown-content"
        parseIncompleteMarkdown={status === 'generating'}
      >
        {content}
      </Streamdown>
    </div>
  );
}
```

#### Phase 3: Style Math with Tailwind

```css
/* src/app/globals.css */

/* KaTeX base styles */
.katex {
  @apply font-math;  /* Custom math font if desired */
}

/* Display mode equations - centered, larger */
.katex-display {
  @apply my-4 overflow-x-auto;
  @apply rounded-lg bg-muted/30 p-4;
  @apply border border-border/50;
}

/* Inline math - subtle highlight */
.katex-inline {
  @apply px-1 py-0.5 rounded;
  @apply bg-accent/10;
}

/* Error states */
.katex-error {
  @apply text-destructive;
  @apply border-b-2 border-destructive/50;
  @apply cursor-help;
}

/* Mobile responsive */
@media (max-width: 640px) {
  .katex-display {
    @apply text-sm p-2;
  }
}

/* Dark mode specific */
.dark .katex {
  @apply text-foreground;
}

.dark .katex-display {
  @apply bg-background/50;
}
```

#### Phase 4: Configure Streamdown Options

```tsx
// src/lib/markdown/config.ts
import type { StreamdownProps } from 'streamdown';

export const streamdownConfig: StreamdownProps = {
  // Enable incomplete markdown parsing during streaming
  parseIncompleteMarkdown: true,

  // Custom components for code blocks
  components: {
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <CodeBlock language={match[1]} {...props}>
          {String(children).replace(/\n$/, '')}
        </CodeBlock>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  },
};
```

#### Phase 5: Optimize Bundle Size

```js
// next.config.ts
export default {
  webpack: (config, { isServer }) => {
    // Don't bundle KaTeX on server (it's SSR-capable)
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          katex: {
            test: /[\\/]node_modules[\\/](katex)[\\/]/,
            name: 'katex',
            chunks: 'all',
            priority: 10,
          },
        },
      };
    }
    return config;
  },
};
```

#### Phase 6: Add Error Handling

```tsx
// src/components/chat/MathErrorBoundary.tsx
'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class MathErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Math rendering error:', error, errorInfo);
    // Log to your error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Failed to render mathematical content
            </p>
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-2 text-xs">
                {this.state.error?.message}
              </pre>
            )}
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Usage
<MathErrorBoundary>
  <MessageContent content={message.content} />
</MathErrorBoundary>
```

#### Phase 7: Accessibility Enhancements

```tsx
// src/components/chat/AccessibleMath.tsx
import { useId } from 'react';

interface AccessibleMathProps {
  latex: string;
  displayMode?: boolean;
  description?: string;  // Human-readable description
}

export function AccessibleMath({
  latex,
  displayMode = false,
  description
}: AccessibleMathProps) {
  const descId = useId();

  // Render with KaTeX (includes MathML automatically)
  const html = katex.renderToString(latex, {
    throwOnError: false,
    displayMode,
    output: 'htmlAndMathml'  // Critical for screen readers
  });

  return (
    <div
      role="math"
      aria-describedby={description ? descId : undefined}
      className={displayMode ? 'katex-display' : 'katex-inline'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
    {description && (
      <span id={descId} className="sr-only">
        {description}
      </span>
    )}
  );
}
```

### Testing Checklist

- [ ] **Basic math rendering**
  - [ ] Inline: `$E = mc^2$`
  - [ ] Display: `$$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$`

- [ ] **Streaming behavior**
  - [ ] Start response with `$$` → should not crash
  - [ ] Add equation content token-by-token
  - [ ] Complete with closing `$$` → should render
  - [ ] Refresh page mid-generation → should resume ✅

- [ ] **Error handling**
  - [ ] Invalid LaTeX: `$$\frac{1}$$` → should show error, not crash
  - [ ] Missing delimiter: `$$x = 5` → should handle gracefully
  - [ ] Unsupported command → should highlight error

- [ ] **Performance**
  - [ ] Long conversation (50+ messages with math) → should not lag
  - [ ] Mobile devices → should render without janking
  - [ ] Bundle size < 300KB for math module

- [ ] **Accessibility**
  - [ ] Test with VoiceOver (macOS) → should announce equations
  - [ ] Test with NVDA (Windows) → basic support
  - [ ] Keyboard navigation works

- [ ] **Copy/paste**
  - [ ] Copy rendered equation → should get LaTeX source
  - [ ] Paste into another app → should work

### Performance Benchmarks

Target metrics for math rendering:
- **Initial render:** < 50ms per equation
- **Streaming update:** < 16ms (60 FPS)
- **Bundle size:** ~150KB (KaTeX + Streamdown)
- **Time to Interactive:** < 2s on 3G

### Monitoring

Add performance tracking:

```tsx
// src/lib/analytics/mathMetrics.ts
export function trackMathRendering(latex: string, duration: number) {
  if (typeof window !== 'undefined' && window.analytics) {
    window.analytics.track('Math Rendered', {
      latexLength: latex.length,
      duration,
      complexity: estimateComplexity(latex),
    });
  }
}

function estimateComplexity(latex: string): 'simple' | 'medium' | 'complex' {
  if (latex.length < 50) return 'simple';
  if (latex.length < 200) return 'medium';
  return 'complex';
}
```

---

## 6. Alternative Approaches

### Option A: react-markdown + remark-math + rehype-katex

**Pros:**
- Industry standard
- Large ecosystem
- Well-documented

**Cons:**
- Poor streaming performance
- Re-renders entire content on each token
- Requires custom buffering logic

**Verdict:** ❌ Not recommended for streaming chat

### Option B: Custom parser with KaTeX

**Pros:**
- Full control
- Optimal performance
- Minimal dependencies

**Cons:**
- Must handle all edge cases yourself
- Regex hell for delimiter detection
- Reinventing the wheel

**Verdict:** ⚠️ Only if you have specific needs Streamdown doesn't meet

### Option C: MathJax for accessibility-first approach

**Pros:**
- Best accessibility
- Comprehensive LaTeX support
- Mature ecosystem

**Cons:**
- Slower rendering
- Larger bundle
- Not ideal for SSR

**Verdict:** ⚠️ Consider if accessibility is critical and performance is secondary

### Option D: Hybrid (KaTeX + MathJax)

**Pros:**
- Best of both worlds
- KaTeX for speed, MathJax fallback for complex equations
- Progressive enhancement

**Cons:**
- Two libraries = larger bundle
- Complex implementation
- Potential inconsistencies

**Verdict:** ⚠️ Overkill for most use cases

---

## 7. Migration Path

If you later need to switch libraries:

### From KaTeX to MathJax

```tsx
// Before (KaTeX)
import 'katex/dist/katex.min.css';
<Streamdown>{content}</Streamdown>

// After (MathJax)
import { MathJaxContext } from 'better-react-mathjax';
<MathJaxContext>
  <ReactMarkdown remarkPlugins={[remarkMath]}>
    {content}
  </ReactMarkdown>
</MathJaxContext>
```

### From Streamdown to Custom Parser

```tsx
// Create adapter layer
export function renderMarkdown(content: string) {
  // Your custom parsing logic
  // Can swap implementation without changing components
}

// Components stay the same
<div>{renderMarkdown(message.content)}</div>
```

---

## 8. Future Considerations

### Upcoming Web Standards

- **MathML in all browsers:** Chrome added native MathML support (2023)
- **CSS Math:** Potential future CSS-based math rendering
- **WebAssembly KaTeX:** Faster rendering via WASM

### AI Model Improvements

- Models getting better at LaTeX generation
- Potential for model-specific rendering hints
- Multi-modal outputs (math + diagrams)

### Accessibility Regulations

- WCAG 3.0 (in progress) may have stronger math accessibility requirements
- Consider MathJax if regulatory compliance is critical

---

## 9. Conclusion

### TL;DR Recommendations

For **blah.chat** (Next.js 15 + React 19 + streaming chat):

1. **Use Streamdown** for markdown + math rendering
2. **Bundled KaTeX** for fast, reliable math
3. **Enable `parseIncompleteMarkdown`** for streaming resilience
4. **SSR when possible** for initial page loads
5. **Monitor bundle size** and lazy-load if needed
6. **Test accessibility** with VoiceOver (good support)
7. **Add graceful error handling** for malformed LaTeX

### Implementation Priority

**Phase 2A (MVP):**
- ✅ Install Streamdown + KaTeX
- ✅ Basic math rendering (inline + display)
- ✅ Streaming support
- ✅ Error boundaries

**Phase 2B (Polish):**
- ⏳ Custom styling with Tailwind
- ⏳ Copy/paste enhancement
- ⏳ Performance monitoring

**Phase 4+ (Enhancement):**
- ⏳ Advanced accessibility features
- ⏳ Mobile optimizations
- ⏳ Bundle size optimization

### Success Metrics

- ✅ Math renders correctly in < 50ms
- ✅ Streaming doesn't break on incomplete delimiters
- ✅ Page refresh during generation preserves math
- ✅ Bundle size < 200KB for math dependencies
- ✅ Accessible to screen reader users (basic support)

---

## Sources

### Library Comparisons
- [KaTeX and MathJax Comparison Demo](https://www.intmath.com/cg5/katex-mathjax-comparison.php)
- [Next math renderer MathJax v3 versus KaTeX? - Meta Stack Exchange](https://meta.stackexchange.com/questions/338933/next-math-renderer-mathjax-v3-versus-katex)
- [KaTeX – The fastest math typesetting library for the web](https://katex.org/)
- [Mathjax vs Katex - Stack Overflow](https://stackoverflow.com/questions/67682656/mathjax-vs-katex)
- [LaTeX | Nextra](https://nextra.site/docs/advanced/latex)

### Implementation in Major Apps
- [Claude.ai introduces LaTeX rendering feature preview](https://www.linkedin.com/posts/anthropicresearch_weve-added-support-for-latex-rendering-as-activity-7232433895848177665-8g4L)
- [Anthropic on X: LaTeX rendering announcement](https://x.com/AnthropicAI/status/1826667671364272301)
- [Math equations – Notion Help Center](https://www.notion.com/help/math-equations)
- [How to Write Mathematical Notations in Obsidian](https://www.makeuseof.com/write-mathematical-notation-obsidian/)

### React/Next.js Integration
- [Render Streaming AI Markdown with Streamdown | Reactscript](https://reactscript.com/render-streaming-ai-markdown/)
- [Streamdown: Markdown Rendering Component Designed for AI Streaming Responses](https://www.kdjingpai.com/en/streamdown/)
- [Math Formatting with KaTeX in React-Markdown using rehype-katex](https://sebdoe.com/post/rehype-katex)
- [Rendering Markdown and LaTeX in React](https://medium.com/@MatDrinksTea/rendering-markdown-and-latex-in-react-dec355e74119)
- [Math | MDX](https://mdxjs.com/guides/math/)
- [Implementing KaTeX in Next.js for Math Formula Rendering](https://medium.com/@saveriomazza/implementing-katex-in-next-js-for-math-formula-rendering-ddfead05642f)

### Accessibility
- [VoiceOver screenreader can't read KaTeX's hidden MathML · Issue #820](https://github.com/KaTeX/KaTeX/issues/820)
- [Accessibility Features — MathJax 4.0 documentation](https://docs.mathjax.org/en/latest/basic/accessibility.html)
- [Make KaTeX accessible · Issue #38](https://github.com/KaTeX/KaTeX/issues/38)
- [Math Accessibility on the Web: ARIA math Role & Best Practices](https://www.manuelsanchezdev.com/blog/math-accessibility-aria-mathml-best-practices)
- [MathML - Accessibility by Design](https://www.chhs.colostate.edu/accessibility/best-practices-how-tos/mathml/)

### Error Handling
- [Handling Errors · KaTeX](https://katex.org/docs/error.html)
- [LaTeX/Errors and Warnings - Wikibooks](https://en.wikibooks.org/wiki/LaTeX/Errors_and_Warnings)

### Performance & Optimization
- [Quick question: Is there a way to build a custom katex bundle? · Issue #2083](https://github.com/KaTeX/KaTeX/issues/2083)
- [Do you optimize the bundle size of your website? | SSW.Rules](https://www.ssw.com.au/rules/optimize-bundle-size/)
- [Reducing Bundle Size for React and MUI using Tree Shaking](https://medium.com/@sargun.kohli152/reducing-bundle-size-for-react-and-mui-using-tree-shaking-a-comprehensive-guide-f4bd709bc0c3)

### Markdown Integration
- [How can I mix LaTeX in with Markdown? - Stack Overflow](https://stackoverflow.com/questions/2188884/how-can-i-mix-latex-in-with-markdown)
- [The Best Way to Support LaTeX Math in Markdown with MathJax](https://yihui.org/en/2018/07/latex-math-markdown/)
- [How does ChatGPT render math in Markdown output?](https://genai.stackexchange.com/questions/386/how-does-chatgpt-render-math-in-markdown-output)

### Streaming-Specific
- [GitHub - vercel/streamdown: A drop-in replacement for react-markdown](https://github.com/vercel/streamdown)
- [Introducing Streamdown: Open source Markdown for AI streaming - Vercel](https://vercel.com/changelog/introducing-streamdown)
- [Streamdown](https://streamdown.ai/)
- [Cookbook: Markdown Chatbot with Memoization](https://ai-sdk.dev/cookbook/next/markdown-chatbot-with-memoization)
- [How to use React-Markdown to show streaming response from OpenAI](https://github.com/orgs/remarkjs/discussions/1342)
- [Preventing Flash of Incomplete Markdown when streaming AI responses](https://news.ycombinator.com/item?id=44182941)

---

**Report compiled:** December 5, 2025
**Next steps:** Implement Phase 2A (basic math rendering with Streamdown)
