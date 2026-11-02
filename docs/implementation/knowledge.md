# blah.chat Implementation Knowledge

This document captures key decisions, architectural patterns, and lessons learned during implementation. For code details, refer to the source files directly.

---

## Core Philosophy

### Design Principles
- **Avoid generic AI aesthetic**: No Inter fonts, no purple gradients on white, no predictable layouts
- **Dark-first**: Inspired by code editor themes (Vesper, Tokyo Night, Catppuccin)
- **Resilient by default**: All AI generation survives page refresh/tab close
- **Cost transparency**: Track and display every penny spent
- **Data ownership**: Full export/import control

### What Makes This Different
- **Resilient Generation**: Unlike client-side streaming (Vercel AI Elements), we use Convex server-side actions that persist to DB. User can close browser mid-generation and response completes.
- **Multi-provider**: 10+ models from OpenAI, Anthropic, Google, xAI, Perplexity, Ollama, OpenRouter
- **RAG Memory**: AI remembers facts about you across conversations via vector search
- **Response Comparison**: Side-by-side multi-model comparison with voting and consolidation

---

## Critical Architecture Decisions

### Why Convex Actions (Not Client Streaming)

**Problem**: Standard AI chat uses `useChat()` hook with client-side streaming. If user refreshes or closes tab, response is lost.

**Solution**: Convex actions run server-side for up to 10 minutes:
1. User sends message → Mutation creates pending assistant message
2. `ctx.scheduler.runAfter(0, generateResponse)` schedules action
3. Action streams from LLM, updates `partialContent` every ~200ms
4. Client subscribes via reactive query → sees updates automatically
5. If client disconnects, action continues → client sees completed response on reconnect

**Message States**: `pending` → `generating` → `complete` | `error`

**Key Fields**:
- `status`: Current generation state
- `partialContent`: Streamed content during generation
- `generationStartedAt`, `generationCompletedAt`: For timing metrics

**Test This Works**: Send "Write a long story" → Close tab after 2 seconds → Reopen → Response should be complete or still generating.

### Why Not Vercel AI Elements

Evaluated for UI patterns but incompatible with resilient generation:
- AI Elements uses client-side state management
- Cannot survive page refresh (fails our core requirement)
- We use it as **design inspiration only**: action toolbars, loading animations, input UX

### Hybrid Search (RRF)

Combined full-text + semantic search using Reciprocal Rank Fusion:
- Full-text: Convex search index for keyword matches
- Vector: Embeddings (1536 dimensions) for semantic similarity
- Merge: RRF algorithm combines rankings (k=60 typically)

```
score = sum(1 / (k + rank)) for each result list
```

This gives better results than either method alone.

### Memory System Architecture

1. **Extraction**: After conversation ends, `gpt-4o-mini` extracts facts
2. **Embedding**: Generate 1536-dim vectors via `text-embedding-3-small`
3. **Storage**: Vector index with filters (userId, projectId, status)
4. **Retrieval**: On new message, query top 5-10 relevant memories
5. **Injection**: Add to system prompt naturally

**Cost Optimization**: Use `gpt-4o-mini` for extraction (not gpt-4o) - 10x cheaper.

### TypeScript Type Depth Workaround

With 94+ Convex modules, TypeScript hits recursion limits. Pragmatic solution:

```typescript
const result = ((await (ctx.runQuery as any)(
  // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
  internal.path.to.query,
  { args },
)) as ReturnType);
```

This bypasses parameter inference while preserving return type safety.

---

## Feature-Specific Knowledge

### Response Comparison (Phase 12)

**Industry Research**:
- LMSYS Arena: 50/50 two-column, anonymous models until voting, Elo ratings
- Perplexity: Multi-model checkbox selection, side-by-side
- Key learning: 2-up most common, blind testing reduces bias

**Architecture**:
- `comparisonGroupId` links all responses from same prompt
- N pending messages created simultaneously
- N parallel `generateResponse` actions scheduled
- UI detects `comparisonGroupId` → renders `ComparisonView`

**Scroll Sync**: Custom implementation (50 lines), not external library:
- Percentage-based sync (handles different content heights)
- `requestAnimationFrame` throttling (60fps)
- Passive event listeners (mobile performance)
- Libraries evaluated: `react-scroll-sync` (unmaintained), `use-scroll-sync` (too simple)

**Consolidation Flow**:
1. User clicks "Consolidate" → selects model
2. Backend builds prompt with all responses
3. Creates new conversation with consolidated prompt
4. Navigates to new chat

### Voice Features (Phase 15)

**STT Providers**:
- OpenAI Whisper: High accuracy, $0.006/min
- Groq Whisper: 8x faster, $0.00067/min, uses `whisper-large-v3-turbo`
- Deepgram Nova-3: $0.0043/min (stubbed)
- AssemblyAI: $0.015/min (stubbed)

**TTS**:
- Deepgram Aura only (ElevenLabs/LMNT removed - no pay-as-you-go)
- MSE (Media Source Extensions) for real-time streaming
- Chunking at sentence boundaries (~200 chars)
- Buffered playback while generating subsequent chunks

**Why Single TTS Provider**: Simplifies error handling, reduces UI complexity, Deepgram has best pay-as-you-go pricing.

### Cost Tracking (Phase 7)

**Per-Message**: `inputTokens`, `outputTokens`, `cachedTokens`, `reasoningTokens`, `cost` (USD)

**Daily Aggregation**: `usageRecords` table sums by date + model

**Budget System**: Pre-flight check against monthly budget before generation

**Pricing Config**: Centralized in `src/lib/ai/models.ts` - update when providers change pricing.

### Import/Export (Phase 13)

**ChatGPT Format**:
- Messages stored as graph (parent/children links)
- Timestamps in seconds (we use milliseconds)
- Content in `parts` array (usually 1 element)
- Walk backwards from `current_node` following parent links

**Export Formats**: JSON (full backup), Markdown (readable), ChatGPT-compatible

---

## Common Pitfalls & Lessons

### Convex Action Limits
- **10-minute timeout**: For extremely long generations, implement chunking
- **No streaming to client**: Must use `partialContent` field + reactive query

### Embedding Costs
- Generate async, batch for backfills
- Don't regenerate unnecessarily
- Use cheaper model (`text-embedding-3-small`)

### Context Window Exhaustion
- Track tokens per conversation
- Implement truncation strategy early
- Show visual indicator when approaching limit

### Memory Extraction Cost
- Use `gpt-4o-mini`, not `gpt-4o` - 10x cheaper, sufficient quality
- Extract at end of conversation, not per-message

### Generic AI Look
- Review design decisions in Phase 0 before implementing features
- Typography: Avoid Inter/Roboto/Arial
- Colors: Code editor themes, not purple gradients
- Motion: High-impact animations, not excessive

---

## Remaining Work (as of Dec 2025)

### Phase 13 (~34% remaining)
- **Code Splitting**: No `next/dynamic` usage found - add to heavy components (CommandPalette, VirtualizedMessageList, settings modals)

### Phase 14 (~20% remaining)
- **Scheduled Prompts UI**: Schema exists, needs CRUD queries/mutations + UI page + navigation link

### Phase 15 (~25% remaining)
- **Deepgram Nova-3 STT**: API similar to OpenAI, just needs implementation
- **AssemblyAI STT**: Two-step upload → poll pattern
- **Auto-read TTS**: Toggle exists, needs hook to trigger playback on message complete

---

## Key Files Reference

### Core Chat
- `convex/chat.ts`: sendMessage mutation, orchestrates generation
- `convex/generation.ts`: LLM streaming action with progressive updates
- `convex/messages.ts`: Message CRUD, status tracking
- `src/components/chat/ChatMessage.tsx`: Message rendering with status

### Multi-Model
- `src/lib/ai/models.ts`: Model config, pricing, capabilities
- `src/lib/ai/registry.ts`: Provider setup (OpenAI, Anthropic, Google, Ollama)
- `src/components/chat/ModelSelector.tsx`: Model picker UI

### Memory System
- `convex/memories.ts`: Extraction, storage, retrieval
- `convex/schema.ts`: Vector index configuration (1536 dimensions)

### Voice
- `convex/transcription.ts`: STT providers
- `convex/tts.ts`: Deepgram Aura integration
- `src/contexts/TTSContext.tsx`: MSE streaming, playback state
- `src/hooks/useTTSAudioPlayer.ts`: Audio player with seek/speed

### Comparison
- `convex/votes.ts`: Vote recording
- `src/hooks/useSyncedScroll.ts`: Scroll sync for comparison panels
- `src/components/chat/ComparisonView.tsx`: Side-by-side rendering

### Cost & Usage
- `src/lib/utils/calculateCost.ts`: Cost calculation
- `convex/usageTracking/`: Usage recording
- `src/app/(main)/usage/`: Dashboard

---

## Testing Priorities

1. **Resilient generation**: Close tab mid-generation → response completes
2. **Model switching**: Change model → send message → correct model used
3. **Memory recall**: Tell AI fact → new chat → AI remembers
4. **Cost accuracy**: Send messages → verify cost calculations
5. **Export/import**: Export data → import → verify integrity
6. **Comparison**: Select 3 models → all respond → voting works

---

## Future Considerations

### If Adding New Provider
1. Add to `src/lib/ai/registry.ts`
2. Add model configs to `src/lib/ai/models.ts` (pricing, capabilities, context window)
3. Update cost calculation if pricing structure differs
4. Test thinking effort if model supports it

### If Changing Message Schema
- Check `comparisonGroupId`, `consolidatedMessageId` indexes
- Verify resilient generation flow still works
- Update export/import parsers

### If Adding Real-Time Features
- Convex websocket subscriptions handle most cases
- For cross-user real-time, consider Convex presence/broadcasting

### Performance Scaling
- Virtualization already implemented for 50+ messages
- Code splitting needed for initial bundle reduction
- Consider vector index sharding if memories table grows large
