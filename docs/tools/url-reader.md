# URL Reader Tool

## Overview

Fetch and extract content from URLs shared in chat. Summarize articles, read documentation, extract data.

---

## Priority

**🟡 MEDIUM PRIORITY** - High value for link processing workflows.

---

## Use Cases

- "Summarize this article: [URL]"
- "What does this documentation say about X?"
- "Extract the main points from this page"
- "Read this blog post and tell me the key takeaways"

---

## API Recommendations

### Option 1: Jina Reader (Recommended)

**Best for:** Free tier, simple integration

| Feature | Value |
|---------|-------|
| Pricing | **Free** (20 req/min), 200 req/min with key |
| Output | Clean markdown |
| JavaScript | ✅ Renders dynamic pages |
| Ease | Just prepend `https://r.jina.ai/` to URL |

**Pros:**
- Free without API key
- Returns LLM-ready markdown
- Handles JavaScript-rendered pages

**Cons:**
- Rate limited without key
- May struggle with heavily protected sites

```bash
# Optional - increases rate limit
JINA_API_KEY=jina_...
```

**Usage:**
```typescript
const content = await fetch(`https://r.jina.ai/${url}`);
const markdown = await content.text();
```

---

### Option 2: Firecrawl

**Best for:** Enterprise scraping with full features

| Feature | Value |
|---------|-------|
| Pricing | Free: 500 credits, $19/mo for 3,000 |
| Output | Markdown, structured data |
| JavaScript | ✅ Full browser rendering |
| Extra | Site crawling, screenshots |

**Pros:**
- Full site crawling
- LLM-optimized extraction
- Screenshot capability

**Cons:**
- More expensive
- Might be overkill for simple reads

```bash
FIRECRAWL_API_KEY=fc-...
```

---

### Option 3: DIY with Cheerio/Readability

**Best for:** Cost-conscious, static pages only

| Feature | Value |
|---------|-------|
| Pricing | Free (local execution) |
| Output | Extracted text |
| JavaScript | ❌ Static HTML only |
| Libraries | `cheerio`, `@mozilla/readability` |

**Pros:**
- Zero cost
- Full control
- No external dependency

**Cons:**
- Won't work with JS-rendered content
- Need to handle edge cases
- May be blocked by some sites

---

## Recommendation

**Start with Jina Reader** - Free, simple to integrate, handles most cases.

**Upgrade to Firecrawl** if you need site crawling or more reliability.

---

## Implementation Complexity

**🟡 MEDIUM** - 2 hours

- External API (or DIY)
- Backend action needed
- Handle timeouts and errors gracefully

---

## Tool Schema

```typescript
inputSchema: z.object({
  url: z.string().url().describe("URL to read"),
  format: z.enum(["markdown", "text", "summary"]).optional().default("markdown")
    .describe("Output format"),
  maxLength: z.number().optional().default(5000)
    .describe("Max characters to return (prevent context overflow)"),
})
```

---

## Example Responses

```json
{
  "success": true,
  "url": "https://example.com/article",
  "title": "How to Build AI Agents",
  "content": "# How to Build AI Agents\n\nThis article covers...",
  "wordCount": 1200,
  "truncated": false
}
```

---

## Tool Description

```
Read and extract content from a URL.

✅ USE FOR:
- Summarizing articles user shares
- Reading documentation pages
- Extracting information from websites

❌ DO NOT USE FOR:
- Searching (use web search tool first)
- Pages requiring login
- Large files (PDFs, videos)

Returns clean markdown text from the page.
```

---

## Implementation Code

```typescript
// convex/ai/tools/url-reader.ts
import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";

export function createUrlReaderTool(ctx: ActionCtx) {
  return tool({
    description: `Read and extract content from a URL.

✅ USE FOR: Summarizing articles, reading docs, extracting info
❌ DO NOT USE FOR: Searching (use web search), login-required pages

Returns clean markdown from the page.`,

    inputSchema: z.object({
      url: z.string().url().describe("URL to read"),
      maxLength: z.number().optional().default(5000),
    }),

    // @ts-ignore
    execute: async ({ url, maxLength }) => {
      return await ctx.runAction(internal.tools.urlReader.read, {
        url,
        maxLength,
      });
    },
  });
}

// convex/tools/urlReader.ts
import { v } from "convex/values";
import { internalAction } from "../_generated/server";

export const read = internalAction({
  args: {
    url: v.string(),
    maxLength: v.number(),
  },
  handler: async (ctx, { url, maxLength }) => {
    try {
      // Use Jina Reader (free, no API key required)
      const response = await fetch(`https://r.jina.ai/${url}`, {
        headers: {
          // Optional: Add API key for higher rate limits
          // "Authorization": `Bearer ${process.env.JINA_API_KEY}`,
          "Accept": "text/markdown",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to read URL: ${response.statusText}`);
      }

      let content = await response.text();

      // Truncate if too long
      const truncated = content.length > maxLength;
      if (truncated) {
        content = content.slice(0, maxLength) + "\n\n[Content truncated...]";
      }

      // Extract title from first heading
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : url;

      return {
        success: true,
        url,
        title,
        content,
        wordCount: content.split(/\s+/).length,
        truncated,
      };
    } catch (error) {
      return {
        success: false,
        url,
        error: error instanceof Error ? error.message : "Failed to read URL",
      };
    }
  },
});
```

---

## Environment Variables

```bash
# Optional - increases rate limit
JINA_API_KEY=jina_xxxxxxxxxx
```

---

## UI Display

- **Icon:** `Link` or `FileText` from lucide-react
- **Running:** "Reading page..."
- **Complete:** "{title} ({wordCount} words)"
- **Expanded:** Show truncated content preview

---

## Testing Checklist

- [ ] Read a simple blog post
- [ ] Read GitHub README
- [ ] Handle JavaScript-heavy site (may need Firecrawl)
- [ ] Handle 404 error
- [ ] Handle timeout
- [ ] Test content truncation
