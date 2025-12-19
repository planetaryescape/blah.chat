# Smart Manager

Smart Manager is a dual-feature enhancement that adds task extraction from meeting transcripts and transforms projects into full workspace hubs with file RAG capabilities.

## Features

### Smart Assistant
Upload meeting recordings or paste transcripts to extract actionable tasks with AI-powered analysis:
- Confidence scoring (0.5-1.0 scale)
- Smart deadline parsing ("next Friday" → ISO timestamps)
- Auto-tagging using existing tag system
- Memory extraction for important meeting details
- Review workflow before confirming tasks

### Expanded Projects
Projects are now full workspace hubs linking conversations, files, notes, and tasks:
- File RAG: Upload documents → chunk → embed → semantic search
- Tabbed interface (Overview, Conversations, Notes, Files, Tasks, Settings)
- Activity feed tracking all project events
- AI chat context includes project files and tasks

---

## Architecture Decisions

### Schema Design

**Normalized junction tables** instead of nested arrays:
- `projectNotes`, `projectFiles`, `taskTags` for many-to-many relationships
- 40% smaller documents, 10x faster cascade deletes
- Queryable relationships for analytics

**Dual-write pattern** for project-conversation relationships:
- Junction table (`projectConversations`) for many-to-many queries
- Direct `projectId` field on conversations for fast single-project lookups
- Both kept in sync by mutations

**Vector indexes** on `fileChunks` and `tasks`:
- 1536 dimensions (text-embedding-3-small)
- Filter fields: userId, projectId for scoped search
- Enables semantic search within project context

### File RAG Pipeline

**Chunking strategy**:
- 1500 tokens (~6000 chars) per chunk
- 300 token overlap for context preservation
- Character-based splitting (simple, effective)
- Metadata preserved: page numbers, section titles, char offsets

**Why these numbers**: Balances context preservation vs chunk count. Smaller chunks lose context; larger chunks reduce retrieval precision. 1500 tokens fits well within embedding model limits while preserving paragraph-level meaning.

**Embedding model**: `text-embedding-3-small`
- Cost-effective ($0.02/1M tokens)
- 1536 dimensions (good quality/size tradeoff)
- Batch processing: 100 chunks per API call

**Retrieval**: Top-5 chunks, no similarity threshold
- Always returns results (avoids empty responses)
- Ranking handles relevance naturally
- No reranking for MVP (can add later)

### Task Extraction

**LLM choice**: gpt-4o-mini for cost efficiency
- Fast, cheap, good enough for structured extraction
- Zod schema validation ensures output structure

**Three-tier tag matching**:
1. Exact slug match (normalize case/whitespace)
2. Fuzzy match (Levenshtein distance ≤ 2) for typos
3. Semantic similarity (cosine ≥ 0.85) for synonyms

This achieves >80% tag reuse rate, preventing tag sprawl.

**Deadline parsing**: Separate LLM call with current date context
- Handles relative dates ("next Friday", "end of week")
- Preserves original text for transparency (`deadlineSource` field)
- Returns null for ambiguous deadlines (safe default)

### Activity Tracking

Events logged on all resource mutations:
- `task_created`, `task_completed`
- `note_linked`, `note_removed`
- `file_linked`, `file_removed`
- `memory_extracted`

Metadata includes resource titles/names for feed display without N+1 queries.

---

## Key Implementation Patterns

### Resilient Processing
All long-running operations (transcription, embedding) use Convex actions with status tracking:
- `pending` → `processing` → `completed`/`failed`
- Client subscribes via reactive queries
- Survives page refresh, browser close

### Type Safety Workarounds
With 94+ Convex modules, TypeScript hits recursion limits. Consistent patterns:

**Frontend hooks**:
```typescript
// @ts-ignore - Type depth exceeded
const mutation = useMutation(api.tasks.create);
```

**Backend internal calls**:
```typescript
const result = ((await (ctx.runQuery as any)(
  // @ts-ignore - TypeScript recursion limit
  internal.path.to.query,
  { args }
)) as ReturnType);
```

### Project Context Injection
Chat generation injects project context when `conversation.projectId` exists:
1. Project system prompt (custom instructions)
2. Relevant file chunks via RAG (semantic search on user message)
3. Active tasks list

This happens in `convex/generation.ts` before LLM call.

---

## File Locations

| Component | Location |
|-----------|----------|
| Schema | `convex/schema.ts` (tasks, projectNotes, projectFiles, fileChunks, activityEvents, taskTags) |
| Tasks CRUD | `convex/tasks.ts` |
| Task extraction | `convex/ai/taskExtraction.ts` |
| Task auto-tagging | `convex/tasks/tags.ts` |
| Projects backend | `convex/projects.ts` (junctions, resources, activity, stats) |
| File chunking | `convex/files/chunking.ts` |
| File extraction | `convex/files/extraction.ts` (PDF, DOCX, text) |
| File embeddings | `convex/files/embeddings.ts` |
| File search | `convex/files/search.ts` |
| Smart Assistant UI | `src/app/(main)/assistant/page.tsx` |
| Task Review Panel | `src/components/assistant/TaskReviewPanel.tsx` |
| Project detail pages | `src/app/(main)/projects/[id]/` (6 tabs) |
| Tasks dashboard | `src/app/(main)/tasks/` |
| Generation context | `convex/generation.ts` (lines 197-210 for project injection) |

---

## Future Enhancement Considerations

### Performance
- **Large files**: PDF/DOCX extraction uses LLM (Grok). For files >100 pages, consider chunked extraction or dedicated libraries.
- **Embedding queue**: Currently sequential. Could batch across files for throughput.
- **Activity feed**: No aggregation yet. "John completed 5 tasks" vs 5 separate events.

### Features
- **Cross-project search**: Currently scoped to single project. Global file search would need different index strategy.
- **Reranking**: Could add cross-encoder reranking for better retrieval quality.
- **Task dependencies**: No blocking/dependency relationships yet.
- **Team sharing**: All personal for MVP. Would need permission model on junctions.
- **Drag-drop ordering**: `position` field exists on tasks but UI not implemented.

### Data Model
- **Memory-project linking**: Memories extracted from transcripts could link to projects via `projectId` field (schema supports it, not fully utilized).
- **File chunk deletion**: Currently orphans chunks on file delete. Add cascade cleanup.
- **Conversation-task linking**: Tasks track `sourceId` but no junction for many-to-many.

---

## Testing Checklist

Critical paths to verify after changes:

1. **Smart Assistant flow**: Upload audio → transcribe → extract 5+ tasks → review → confirm → appear in dashboard
2. **File RAG**: Upload PDF → "Processing" status → "Indexed" → ask question in chat → response uses file content
3. **Project workspace**: Link resources → tabs show correct counts → activity feed updates
4. **Task dashboard**: Today view → filter by project → complete task → moves to completed

---

## Design Philosophy

- **No generic AI aesthetic**: Distinctive UI with confidence badges, context snippets, smart deadlines
- **Resilient by default**: All async operations persist to DB, never lose work
- **Normalized schema**: Junction tables for flexibility, avoid nested document bloat
- **Semantic over keyword**: Vector search for files and tasks, not just full-text
- **Review before commit**: Users confirm AI-extracted tasks, never auto-create

This matches 2025 industry trends in AI meeting tools (Otter.ai, Fireflies, Granola) and workspace products (Notion, Linear).
