# Google Grounding for Gemini Models - Research

**Status**: Not implemented (Dec 2025)
**Decision**: Keep Tavily for all models due to tool conflict concerns

## Overview

Google Grounding allows Gemini models to use Google Search natively for real-time information. The Vercel AI SDK supports this via `google.tools.googleSearch({})`.

## Implementation Options

### Option 1: Provider-Defined Tool (Recommended by Google)

```typescript
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

const { text, sources, providerMetadata } = await generateText({
  model: google("gemini-2.5-flash"),
  tools: {
    google_search: google.tools.googleSearch({}),
  },
  prompt: "What happened in tech news today?",
});

// Access grounding metadata
const groundingMetadata = providerMetadata?.google?.groundingMetadata;
```

### Option 2: Model-Level Setting

```typescript
const model = google("gemini-2.5-flash", {
  useSearchGrounding: true,
});

const { text, sources } = await generateText({
  model,
  prompt: "What happened in tech news today?",
});
```

## Grounding Metadata Structure

When grounding is enabled, `providerMetadata.google.groundingMetadata` contains:

```json
{
  "groundingMetadata": {
    "groundingChunks": [
      {
        "web": {
          "uri": "https://example.com/article",
          "title": "Article Title"
        }
      }
    ],
    "groundingSupports": [
      {
        "segment": {
          "startIndex": 0,
          "endIndex": 85,
          "text": "The text that was grounded..."
        },
        "groundingChunkIndices": [0, 1],
        "confidenceScores": [0.95, 0.87]
      }
    ],
    "webSearchQueries": ["search query used"],
    "searchEntryPoint": {
      "renderedContent": "..."
    }
  }
}
```

### Key Fields

| Field | Description |
|-------|-------------|
| `groundingChunks` | Array of web sources with `uri` and `title` |
| `groundingSupports` | Maps response text segments to source indices |
| `webSearchQueries` | Queries the model generated for search |
| `searchEntryPoint` | Main search result content |

## Known Issues

### Tool Conflict (Critical)

**GitHub Issue**: [vercel/ai#8258](https://github.com/vercel/ai/issues/8258)

When Google's built-in tools (`google_search`, `url_context`) are enabled alongside custom tools, **custom tools may not be invoked**. The model tends to prefer built-in tools and may ignore custom ones entirely.

This means enabling Google Search could break:
- Calculator tool
- DateTime tool
- Memory tools
- Task management tools
- All other custom tools

**Status**: Unresolved as of Dec 2025. May be fixed in future AI SDK versions.

### Billing Differences

- **Gemini 3 models**: Billed per search query executed (multiple queries = multiple charges)
- **Gemini 2.5 and older**: Billed per prompt (flat rate regardless of search queries)

## Integration Points in blah.chat

If implementing in the future, these files would need changes:

### 1. `convex/generation.ts` (~line 437-449)

Add conditional tool selection:

```typescript
import { google } from "@ai-sdk/google";

// In generateResponse action
const isGeminiModel = args.modelId.startsWith("google:");

const tools: Record<string, any> = {
  calculator: calculatorTool,
  datetime: dateTimeTool,
  // Conditional web search
  ...(isGeminiModel
    ? { googleSearch: google.tools.googleSearch({}) }
    : { tavilySearch: tavilySearch({ searchDepth: "advanced", includeAnswer: true, maxResults: 5 }) }
  ),
  // ...rest of tools
};
```

### 2. `convex/generation/sources.ts`

Extend `extractSources()` to handle Google metadata:

```typescript
// Add after existing extraction logic (around line 89)
// 4. Google Grounding metadata
const googleMeta = providerMetadata?.google;
const groundingChunks = googleMeta?.groundingMetadata?.groundingChunks;
if (Array.isArray(groundingChunks) && groundingChunks.length > 0) {
  for (const chunk of groundingChunks) {
    if (chunk.web?.uri) {
      allSources.push({
        title: chunk.web.title || "Search Result",
        url: chunk.web.uri,
        snippet: undefined,
        publishedDate: undefined,
      });
    }
  }
}
```

### 3. Tool Renderers (Maybe)

If tool call records appear, add to `src/components/chat/toolRenderers/index.ts`:

```typescript
googleSearch: WebSearchRenderer,
```

But likely not needed - grounding is transparent and sources flow through existing display.

## Current Implementation (Tavily)

blah.chat currently uses Tavily for all models:

```typescript
// convex/generation.ts
import { tavilySearch } from "@tavily/ai-sdk";

const tools = {
  tavilySearch: tavilySearch({
    searchDepth: "advanced",
    includeAnswer: true,
    maxResults: 5,
  }),
  // ...
};
```

Tavily advantages:
- Works consistently across all models
- No tool conflict issues
- AI-generated answer summaries (`includeAnswer: true`)
- Existing source extraction and display works

## Future Considerations

### When to Revisit

1. **AI SDK fixes tool conflict** - Monitor [issue #8258](https://github.com/vercel/ai/issues/8258)
2. **Google improves grounding** - May add features Tavily lacks
3. **Cost optimization** - If Google Search becomes cheaper than Tavily
4. **Quality comparison** - If Google provides better results for certain queries

### Testing Plan (When Ready)

1. Enable Google Search for single Gemini model
2. Test all custom tools still work (calculator, datetime, memories, tasks)
3. Compare source quality vs Tavily
4. Monitor costs
5. Roll out to all Gemini models if successful

## References

- [Vercel AI SDK Google Provider](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai)
- [Gemini Grounding Guide](https://ai.google.dev/gemini-api/docs/google-search)
- [Tool Conflict Issue](https://github.com/vercel/ai/issues/8258)
- [AI SDK Gemini 2.5 Guide](https://ai-sdk.dev/cookbook/guides/gemini-2-5)
