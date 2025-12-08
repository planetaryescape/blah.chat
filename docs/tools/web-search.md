# Web Search Tool

## Overview

Search the web for current information. Essential for any AI assistant that needs real-time data.

---

## Priority

**🔴 HIGH PRIORITY** - Foundational capability that ChatGPT, Claude, and Grok all have.

---

## Use Cases

- Current events: "What happened in the news today?"
- Real-time data: "Current price of Bitcoin"
- Recent information: "Latest Next.js release notes"
- Fact-checking: "Is X true?"
- Research: "Best practices for Y in 2024"

---

## API Recommendations

### Option 1: Tavily (Recommended for AI)

**Best for:** AI agents and RAG applications

| Feature | Value |
|---------|-------|
| Pricing | Free: 1,000/mo, Pay-as-you-go: $0.008/credit |
| Latency | Fast |
| AI-Optimized | ✅ Returns comprehensive content with citations |
| Index | Own index + aggregates sources |

**Pros:**
- Built specifically for LLMs
- Returns content, not just links
- Aggregates and ranks 20+ sources

**Cons:**
- Newer, smaller index than Google

```bash
TAVILY_API_KEY=tvly-...
```

---

### Option 2: Exa (Semantic Search)

**Best for:** Semantic/neural search

| Feature | Value |
|---------|-------|
| Pricing | $50 free credits, $5/1000 neural searches |
| Latency | Fast |
| AI-Optimized | ✅ Semantic search, not keyword matching |
| Index | Papers, tweets, news (100M+ pages) |

**Pros:**
- Finds conceptually similar content
- AI-generated answers with citations
- Great for research

**Cons:**
- Different from traditional search
- May miss specific keyword matches

```bash
EXA_API_KEY=...
```

---

### Option 3: Brave Search API

**Best for:** Privacy-focused, independent index

| Feature | Value |
|---------|-------|
| Pricing | Free: 2,000/mo, Pro: $9/1000 |
| Latency | Fast |
| AI-Optimized | ✅ Structured JSON for AI |
| Index | Own independent index |

**Pros:**
- Privacy-first
- No Google dependency
- Competitive pricing

**Cons:**
- Smaller index for niche content

```bash
BRAVE_API_KEY=...
```

---

### Option 4: Serper (Google Results)

**Best for:** Google-quality results at low cost

| Feature | Value |
|---------|-------|
| Pricing | Free: 2,500, ~$0.30/1000 |
| Latency | 1-2 seconds |
| AI-Optimized | ⚠️ Returns SERP data, needs parsing |
| Index | Google |

**Pros:**
- Cheapest option
- Google's comprehensive index
- Fast

**Cons:**
- Returns search results, not full content
- Need second step to fetch page content

```bash
SERPER_API_KEY=...
```

---

## Recommendation

**Start with Tavily** - Best AI integration, generous free tier, returns what LLMs need.

**Alternative: Brave** if you want independent index and better pricing at scale.

---

## Implementation Complexity

**🟡 MEDIUM** - 2-3 hours

- External API required
- Backend action needed
- Environment variable setup

---

## Tool Schema

```typescript
inputSchema: z.object({
  query: z.string().describe("Search query"),
  maxResults: z.number().optional().default(5).describe("Number of results (1-10)"),
  searchDepth: z.enum(["basic", "advanced"]).optional().default("basic")
    .describe("basic=fast, advanced=comprehensive"),
})
```

---

## Example Responses

```json
{
  "success": true,
  "query": "Next.js 15 new features",
  "results": [
    {
      "title": "Next.js 15 Release Notes",
      "url": "https://nextjs.org/blog/next-15",
      "content": "Next.js 15 introduces...",
      "score": 0.95
    },
    // ...more results
  ]
}
```

---

## Tool Description

```
Search the web for current information.

✅ USE FOR:
- Current events and news
- Real-time data (prices, weather, etc.)
- Recent documentation or release notes
- Fact-checking claims

❌ DO NOT USE FOR:
- Information you already know from training
- User's personal preferences (use memory tool)
- Code generation tasks

Returns top results with titles, URLs, and content snippets.
```

---

## Implementation Code

```typescript
// convex/ai/tools/web-search.ts
import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";

export function createWebSearchTool(ctx: ActionCtx) {
  return tool({
    description: `Search the web for current information.

✅ USE FOR: Current events, real-time data, recent docs, fact-checking
❌ DO NOT USE FOR: Training knowledge, user preferences

Returns top results with URLs and content.`,

    inputSchema: z.object({
      query: z.string().describe("Search query"),
      maxResults: z.number().optional().default(5),
    }),

    // @ts-ignore
    execute: async ({ query, maxResults }) => {
      return await ctx.runAction(internal.tools.webSearch.search, {
        query,
        maxResults,
      });
    },
  });
}

// convex/tools/webSearch.ts
import { v } from "convex/values";
import { internalAction } from "../_generated/server";

export const search = internalAction({
  args: {
    query: v.string(),
    maxResults: v.number(),
  },
  handler: async (ctx, { query, maxResults }) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) throw new Error("TAVILY_API_KEY not configured");

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        search_depth: "basic",
        include_answer: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      query,
      answer: data.answer,
      results: data.results.map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
      })),
    };
  },
});
```

---

## Environment Variables

```bash
# .env.local
TAVILY_API_KEY=tvly-xxxxxxxxxx
```

---

## UI Display

- **Icon:** `Search` or `Globe` from lucide-react
- **Running:** "Searching the web..."
- **Complete:** "{N} results found"
- **Expanded:** Show result titles with links

---

## Testing Checklist

- [ ] "What's the weather in San Francisco?"
- [ ] "Latest news about AI"
- [ ] "Current Bitcoin price"
- [ ] "Next.js 15 release date"
- [ ] Test with no results (obscure query)
- [ ] Test API error handling
