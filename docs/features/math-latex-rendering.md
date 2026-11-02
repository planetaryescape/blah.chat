# Math and LaTeX Rendering Feature

**Last Updated:** December 7, 2025
**Status:** Production Ready
**Owner:** Engineering Team

---

## Overview

blah.chat supports real-time rendering of mathematical equations and LaTeX notation in chat messages. This document captures the architectural decisions, implementation details, and maintenance considerations for the math rendering system.

### Why This Feature Exists

Users need to discuss mathematical concepts, equations, and scientific notation in chat. The feature enables:
- Clear mathematical communication
- Support for technical/academic discussions
- Professional presentation of formulas and equations
- Accessibility for screen reader users

---

## Architecture Decisions

### Core Technology Stack

**KaTeX + Streamdown** was chosen over alternatives (MathJax, custom parser) for these critical reasons:

1. **Speed**: KaTeX is synchronous and 3-5x faster than MathJax
2. **Streaming Compatibility**: Streamdown handles incomplete markdown chunks during AI response streaming
3. **SSR Support**: KaTeX produces deterministic output in Node.js and browser
4. **Bundle Size**: ~100KB (acceptable for this feature)
5. **Industry Standard**: Used by Claude.ai, Notion, and other chat applications

### Trade-offs Accepted

**What we sacrificed:**
- Advanced accessibility features (MathJax has better screen reader support)
- Comprehensive LaTeX support (KaTeX covers ~95% of common use cases)
- Native editing experience (could use MathQuill for interactive math input)

**Why these trade-offs are acceptable:**
- Speed and streaming reliability are more critical for chat UX
- 95% LaTeX coverage handles virtually all user needs
- Basic accessibility via MathML output is sufficient for initial release
- We enhanced accessibility in Phase 4C (see implementation phases below)

### Critical Constraint: Resilient Generation

**MUST survive page refresh/tab close during streaming.**

The math rendering integrates with our resilient generation architecture:
1. AI response streams via Convex action (server-side, up to 10min)
2. Periodic DB updates with `partialContent` field
3. Client subscribes via reactive query
4. On refresh: Streamdown resumes rendering from DB state

**Streamdown's `parseIncompleteMarkdown` prop is essential** - it handles partially-arrived math delimiters without crashing.

---

## Implementation Phases

### Phase 2A: MVP (Completed)
**Goal:** Basic math rendering with streaming support

**What was implemented:**
- Streamdown integration with KaTeX
- Inline math: `\(...\)` and `$...$`
- Display math: `$$...$$`
- Chemistry notation via mhchem extension
- Error boundaries (MathErrorBoundary component)
- Common LaTeX macros (ℝ, ℕ, ℤ, ℚ, ℂ, abs, norm)

**Configuration:**
```typescript
// KaTeX options in MarkdownContent.tsx
const katexOptions = {
  errorColor: "hsl(var(--destructive))",
  output: "htmlAndMathml",  // Visual + accessible MathML
  strict: "ignore",         // Continue rendering on unsupported commands
  macros: {
    "\\RR": "\\mathbb{R}",
    "\\NN": "\\mathbb{N}",
    // ... additional macros
  },
};
```

### Phase 4A: Mobile Lazy Rendering (Completed)
**Goal:** 60% reduction in initial mobile render cost

**Why this matters:** Math rendering is CPU-intensive. On mobile devices with limited resources, rendering all equations immediately causes jank and delays interactivity.

**Implementation:**
- `useLazyMathRenderer` hook with IntersectionObserver
- Mobile-only activation (< 768px viewport)
- 1% visibility threshold (early trigger for smooth UX)
- 50px preload margin (start rendering before entering viewport)
- Skeleton placeholder prevents layout shift

**Key files:**
- `src/hooks/useLazyMathRenderer.ts` - Observer hook
- `src/components/chat/MathSkeleton.tsx` - Loading placeholder
- `src/components/chat/MarkdownContent.tsx` - Integration logic

**Fallback:** Desktop and browsers without IntersectionObserver support render immediately.

### Phase 4B: Responsive Typography (Completed)
**Goal:** Fluid font scaling, eliminate jarring breakpoint jumps

**Why CSS clamp():**
- Smooth continuous scaling from 320px to 1920px
- Single CSS line vs 3-4 media query breakpoints
- No JavaScript, no viewport reflow calculations

**Implementation:**
```css
/* Inline math: scales from 0.95rem to 1.21rem */
.katex {
  font-size: clamp(0.95rem, 0.9rem + 0.5vw, 1.21rem);
}

/* Display math: scales from 1.1rem to 1.5rem */
.katex-display {
  font-size: clamp(1.1rem, 1rem + 1vw, 1.5rem);
  padding: clamp(0.75rem, 2vw, 1.5rem);
}
```

**Mobile enhancements:**
- iOS momentum scrolling: `-webkit-overflow-scrolling: touch`
- Responsive scrollbar: `clamp(6px, 1vw, 8px)`

### Phase 4C: Enhanced Accessibility (Completed)
**Goal:** 80%+ semantic descriptions vs generic "Mathematical expression"

**Why this was needed:** Original implementation had only 27 basic patterns. Complex equations all got labeled "Mathematical expression", which is unhelpful for screen reader users.

**Implementation:**
- New `src/lib/math/descriptions.ts` with 50+ semantic patterns
- Pattern categories:
  - Calculus: integrals, derivatives, limits, gradients
  - Linear algebra: matrices, vectors, determinants, norms
  - Statistics: expected value, variance, probability, distributions
  - Set theory: unions, intersections, subset relations
  - Logic: quantifiers, implications, equivalence
  - Chemistry: formulas (mhchem), physical units
  - Greek letters with context (statistical, angles, etc.)

**Fallback chain:**
1. Specific regex pattern match → semantic description
2. Heuristic pattern (broader matching) → category description
3. Final fallback → "Mathematical expression"

**Example transformations:**
- `\int_0^\infty e^{-x^2} dx` → "Integral from 0 to infinity of e^{-x^2} with respect to x"
- `\frac{d}{dx}` → "Derivative with respect to x"
- `\mathbb{E}[X]` → "Expected value of X"
- `P(A|B)` → "Probability of A given B"

**Streaming support:**
```typescript
// ARIA live regions announce math updates during streaming
if (isStreaming) {
  element.setAttribute("aria-live", "polite");
  element.setAttribute("aria-atomic", "true");
}
```

**MathML enhancement layer:** For browsers with MathML support, we inject additional MathML annotations using safe DOM methods (no innerHTML, prevents XSS).

### Phase 4D: Copy Handler Enhancements (Completed)
**Goal:** Professional copy/paste UX with keyboard shortcuts

**Why this matters:** Users need to copy equations to:
- Paste into other LaTeX editors
- Share via messaging apps
- Include in documentation

**Features implemented:**
1. **Keyboard shortcuts:** Cmd/Ctrl+C on focused equation copies LaTeX source
2. **Inline math support:** Small copy button appears on hover/focus
3. **Multi-format clipboard:**
   - Plain text: Wrapped LaTeX (`$$...$$` or `\(...\)`)
   - HTML: Clean structure (not raw KaTeX div with gradients)
   - MathML: For compatible apps (optional)

**UX patterns:**
```typescript
// Display math: visible button (top-right)
// Inline math: hidden button (appears on hover/focus)
// Keyboard: Tab to focus, Cmd/Ctrl+C to copy
```

**Analytics tracking:**
```typescript
analytics.track("math_copied", {
  format: "both" | "latex",
  equationLength: number
});
```

---

## File Structure

### Core Components
- `src/components/chat/MarkdownContent.tsx` - Main markdown/math renderer
  - Integrates Streamdown with KaTeX
  - Handles streaming state
  - Lazy rendering integration
- `src/components/chat/MathErrorBoundary.tsx` - Error boundary for math rendering failures
- `src/components/chat/MathSkeleton.tsx` - Loading placeholder for lazy rendering

### Hooks
- `src/hooks/useMathCopyButtons.ts` - Copy-to-clipboard with multi-format support
- `src/hooks/useMathAccessibility.ts` - ARIA label injection, MathML enhancement
- `src/hooks/useLazyMathRenderer.ts` - IntersectionObserver for mobile performance

### Libraries
- `src/lib/math/descriptions.ts` - 50+ semantic ARIA pattern database

### Styling
- `src/styles/math.css` - Math-specific styles
  - Fluid typography with clamp()
  - Display math backgrounds/borders
  - Inline math copy button styles
  - TipTap editor integration
  - Mobile optimizations

### Analytics
- `src/lib/analytics/mathMetrics.ts` - Performance tracking
  - Render duration (warns if > 50ms)
  - Equation length and complexity
  - Streaming state

---

## Common Maintenance Tasks

### Adding New LaTeX Macros

Edit `katexOptions` in `MarkdownContent.tsx`:

```typescript
const katexOptions = {
  // ...
  macros: {
    "\\RR": "\\mathbb{R}",
    "\\newCommand": "\\mathcal{N}",  // Add here
  },
};
```

### Improving Accessibility Descriptions

Edit `src/lib/math/descriptions.ts`:

```typescript
export const mathPatterns: MathPattern[] = [
  // Add new pattern
  {
    regex: /\\yourpattern\{(.+?)\}/,
    describe: (m) => `Your description with ${m[1]}`
  },
  // ... existing patterns
];
```

**Pattern ordering matters:** More specific patterns should come first.

### Adjusting Mobile Performance Thresholds

Edit `useLazyMathRenderer` call in `MarkdownContent.tsx`:

```typescript
const { observeRef, isRendered, isMobile } = useLazyMathRenderer({
  threshold: 0.01,       // Visibility percentage to trigger
  rootMargin: "50px 0px", // Preload distance
  mobileOnly: true,      // Desktop renders immediately
});
```

### Debugging Rendering Issues

**Math not rendering:**
1. Check browser console for KaTeX errors
2. Verify delimiters: `$$...$$` for display, `\(...\)` for inline
3. Check if equation is in `displayContent` (streaming buffer)
4. Look for MathML in DOM (should be present with `output: "htmlAndMathml"`)

**Performance issues:**
1. Check `mathMetrics` analytics for slow renders (> 50ms)
2. Review equation complexity (long equations should be split)
3. Verify lazy rendering is active on mobile
4. Check if streaming causes re-renders (should be memoized)

**Accessibility issues:**
1. Test with VoiceOver on macOS/iOS (best support)
2. Verify `role="math"` and `aria-label` attributes
3. Check MathML presence in DOM
4. Review `aria-live` regions for streaming content

---

## Bundle Impact

**Total size:** ~11KB added to core bundle

| Phase | Size | What's included |
|-------|------|-----------------|
| 4A | +6KB | IntersectionObserver hook, skeleton component |
| 4B | 0KB | Pure CSS (clamp, momentum scrolling) |
| 4C | +3KB | 50+ semantic patterns library |
| 4D | +2KB | Keyboard handlers, multi-format clipboard |

**Base dependencies:**
- KaTeX: ~100KB (core library, loaded on demand)
- Streamdown: Includes remark-math + rehype-katex (bundled)

**Optimization opportunities:**
- Lazy load KaTeX CSS when math is detected
- Code split math rendering from main bundle
- Tree shake unused KaTeX fonts

---

## Testing Checklist

When making changes, verify:

- [ ] **Basic rendering**
  - [ ] Inline math: `$E = mc^2$` or `\(E = mc^2\)`
  - [ ] Display math: `$$\int_0^\infty e^{-x^2} dx$$`
  - [ ] Chemistry: `$$\ce{H2O}$$`
  - [ ] Matrices, fractions, Greek letters

- [ ] **Streaming resilience**
  - [ ] Start typing `$$` → no crash
  - [ ] Add equation content → renders as plain text
  - [ ] Complete with `$$` → renders as math
  - [ ] Refresh mid-stream → resumes correctly

- [ ] **Mobile performance**
  - [ ] Open chat on mobile device (< 768px)
  - [ ] Scroll to math equation → skeleton appears first
  - [ ] Equation renders after brief delay
  - [ ] No jank or layout shift
  - [ ] Font scales smoothly at different viewport widths

- [ ] **Accessibility**
  - [ ] Screen reader announces semantic description (not "math expression")
  - [ ] Inline math is keyboard-focusable (Tab key)
  - [ ] ARIA live region announces streaming updates
  - [ ] MathML present in DOM

- [ ] **Copy/paste**
  - [ ] Click copy button → LaTeX copied to clipboard
  - [ ] Cmd/Ctrl+C on focused inline math → copies LaTeX
  - [ ] Paste into text editor → shows `$$...$$` wrapper
  - [ ] Visual feedback (checkmark) appears

- [ ] **Error handling**
  - [ ] Invalid LaTeX (`$$\frac{1}$$`) → shows error, doesn't crash
  - [ ] Missing delimiter (`$$x = 5`) → handles gracefully
  - [ ] MathErrorBoundary catches render failures

---

## Future Enhancement Opportunities

### Short Term (Next Quarter)

1. **Bundle Optimization**
   - Lazy load KaTeX CSS (only when math detected)
   - Code split math module from main bundle
   - Target: < 50KB added to initial page load

2. **UX Improvements**
   - Equation numbering for display math
   - Hover preview for complex inline equations
   - Copy history (recent equations)

3. **Mobile Polish**
   - Pinch-to-zoom for large equations
   - Horizontal scroll indicators
   - Tap-to-copy on mobile (no hover)

### Long Term (Future Releases)

1. **Advanced Accessibility**
   - Consider MathJax for users who explicitly need better a11y
   - Audio pronunciation of equations
   - Keyboard navigation through equation structure

2. **Editing Experience**
   - Inline LaTeX editor with live preview
   - Equation templates library
   - Syntax validation with error squiggles
   - MathQuill integration for WYSIWYG math input

3. **Performance**
   - Server-side pre-rendering for known equations
   - Caching rendered equations
   - Progressive hydration strategy

---

## Known Limitations

### KaTeX vs Full LaTeX

**Not supported:**
- `align` environment (use `aligned` instead)
- Some obscure LaTeX packages
- Custom LaTeX macros beyond those we define

**Workarounds:**
- Most limitations have KaTeX-compatible alternatives
- Error messages guide users to correct syntax
- Comprehensive LaTeX support would require MathJax (trade-off not worth it)

### Screen Reader Support

**Works well:**
- VoiceOver (macOS/iOS) ✅
- Basic MathML reading

**Limited support:**
- NVDA (Windows) - basic support, not robust
- JAWS (Windows) - limited support

**Why we accept this:**
- VoiceOver covers majority of users needing a11y
- Phase 4C semantic descriptions improve experience
- Can revisit if compliance requirements change

### Streaming Edge Cases

**Handled gracefully:**
- Incomplete delimiters (`$$` without closing)
- Partial equation content
- Interrupted streaming (page refresh)

**Not handled:**
- Nested streaming contexts (not a real use case)
- Equations larger than Convex action payload limits (unlikely)

---

## Migration Guide

### If Switching to MathJax

```typescript
// Before (KaTeX + Streamdown)
import { Streamdown } from 'streamdown';
<Streamdown>{content}</Streamdown>

// After (MathJax)
import { MathJaxContext } from 'better-react-mathjax';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';

<MathJaxContext>
  <ReactMarkdown remarkPlugins={[remarkMath]}>
    {content}
  </ReactMarkdown>
</MathJaxContext>
```

**Why you might switch:**
- Regulatory requirement for advanced a11y
- Need comprehensive LaTeX support (edge cases)
- Performance becomes less critical

**Bundle impact:** +150KB (MathJax is 3x larger)

### If Custom Parser Needed

Create adapter layer to isolate implementation:

```typescript
// src/lib/markdown/renderer.ts
export function renderMarkdown(content: string) {
  // Swap implementation here
  // Components stay unchanged
}
```

---

## Monitoring and Analytics

### Key Metrics

**Performance:**
- Math render duration (target: < 50ms)
- Slow render warnings (> 50ms logged)
- Mobile lazy render activation rate

**Usage:**
- Math copy events (format, equation length)
- Error rate (invalid LaTeX)
- Streaming interruptions

**Accessibility:**
- Screen reader usage (if detectable)
- Keyboard navigation (focus events)

### Debug Logs

```typescript
// Enable in development
console.debug("[Math] Render duration:", duration);
console.debug("[Math] Pattern matched:", description);
console.debug("[Accessibility] MathML present:", hasMathML);
```

---

## References

### External Documentation
- [KaTeX Documentation](https://katex.org/docs/)
- [Streamdown GitHub](https://github.com/vercel/streamdown)
- [W3C MathML Accessibility](https://w3c.github.io/mathml-aam/)
- [ARIA math role (MDN)](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/math_role)

### Internal Resources
- Original research: `docs/research/math-latex-rendering-report.md` (archived)
- Implementation plan: `.claude/plans/compiled-spinning-walrus.md`
- Analytics: `src/lib/analytics/mathMetrics.ts`

### Key GitHub Issues
- [KaTeX #820](https://github.com/KaTeX/KaTeX/issues/820) - VoiceOver MathML accessibility
- [KaTeX #38](https://github.com/KaTeX/KaTeX/issues/38) - General accessibility tracking

---

## Appendix: LaTeX Delimiter Guide

### Supported Delimiters

| Type | Delimiter | Example | When to Use |
|------|-----------|---------|-------------|
| Inline | `\(...\)` | `\(E = mc^2\)` | Preferred (unambiguous) |
| Inline | `$...$` | `$E = mc^2$` | Common (watch for currency conflicts) |
| Display | `$$...$$` | `$$\int_0^\infty$$` | Standard |
| Display | `\[...\]` | `\[E = mc^2\]` | LaTeX purists |

### Common Pitfalls

**Currency false positives:**
```
"$5 and $10" → Might trigger inline math parser
Fix: Escape: "\$5 and \$10"
```

**Underscore conflicts:**
```
$x_i$ → Markdown sees italic syntax
Fix: Use \(...\) delimiters
```

**Unclosed delimiters during streaming:**
```
"The answer is $$" → Streamdown handles gracefully
Complete: "The answer is $$42$$" → Renders
```

---

**Document Status:** Living document - update as implementation evolves
**Next Review:** Q1 2026 or when making significant changes
