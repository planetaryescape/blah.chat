# Smart Manager - Implementation Documentation

## Overview

**Smart Manager** is a dual-feature enhancement to blah.chat that adds:

1. **Smart Assistant**: Audio/transcript → task extraction with smart deadline detection
2. **Expanded Projects**: Transform projects from simple conversation containers into full workspace hubs

## Features

### Smart Assistant
- Upload meeting recordings or paste transcripts
- AI extracts action items with confidence scores
- Smart deadline parsing ("next Friday" → ISO dates)
- Auto-tagging tasks using existing tag system
- Memory extraction for important meeting details
- Review workflow before confirming tasks

### Expanded Projects
- Link conversations, files, notes, and tasks to projects
- **File RAG**: Upload documents → chunk → embed → semantic search
- Project detail view with tabbed interface
- Activity feed showing all project events
- AI chat context includes project files and tasks
- Global search across all resources

## User Decisions

- **Project structure**: Flat list (no nesting)
- **Task dashboard**: Both global `/tasks` page + project-specific views
- **Search**: Global across all projects
- **Permissions**: Personal only for MVP (future: team sharing)
- **Assignees**: Self-only (all tasks assigned to current user)
- **MVP scope**: Smart deadlines + auto-tagging + memory extraction

## Tech Stack Integration

- **Framework**: Next.js 15, React 19, TypeScript
- **Database**: Convex (real-time, vector search)
- **AI**: Vercel AI SDK with gpt-4o-mini (extraction, tagging, deadlines)
- **Embeddings**: text-embedding-3-small (1536-dim vectors)
- **UI**: shadcn/ui, Tailwind CSS v4
- **Package Manager**: **Bun** (never use npm/yarn/pnpm)

## Implementation Phases

Each phase is documented in a separate MD file with complete context:

1. **[Phase 1: Database Schema](./phase-1-schema.md)** - Foundation tables, indexes, vector search
2. **[Phase 2: Tasks Backend](./phase-2-tasks-backend.md)** - CRUD, extraction, auto-tagging
3. **[Phase 3: Project Expansion Backend](./phase-3-projects-backend.md)** - Junctions, resources, activity feed
4. **[Phase 4: File RAG System](./phase-4-file-rag.md)** - Chunking, embeddings, semantic search
5. **[Phase 5: Smart Assistant UI](./phase-5-assistant-ui.md)** - Upload flow, task review panel
6. **[Phase 6: Project Detail View](./phase-6-project-detail.md)** - Tabbed interface, resource management
7. **[Phase 7: Tasks Dashboard](./phase-7-tasks-dashboard.md)** - Global task views, filters
8. **[Phase 8: Integration & Testing](./phase-8-integration.md)** - Chat context, navigation, testing

## Key Patterns (Across All Phases)

### Resilient Generation
**CRITICAL**: All long-running operations must survive page refresh
- Use Convex actions (not client-side streaming)
- Persist status to database (`pending` → `processing` → `complete/error`)
- Client subscribes via reactive queries

### Type Safety Workarounds
With 94+ Convex modules, TypeScript hits recursion limits:

**Frontend** (`@ts-ignore` on hooks):
```typescript
// @ts-ignore - Type depth exceeded with complex Convex mutation
const myMutation = useMutation(api.path.to.mutation);
```

**Backend** (cast + `@ts-ignore` on internal calls):
```typescript
const result = ((await (ctx.runQuery as any)(
  // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
  internal.path.to.query,
  { args }
)) as ReturnType);
```

### Centralized Prompts
All LLM prompts in `src/lib/prompts/`:
```typescript
// src/lib/prompts/taskExtraction.ts
export const TASK_EXTRACTION_PROMPT = `...`;
```

### Auto-Tagging Pattern
3-tier semantic matching (from `convex/notes/tags.ts`):
1. **Exact slug match**: Normalize case/whitespace
2. **Fuzzy string match**: Levenshtein ≤ 2 for typos
3. **Semantic similarity**: Embedding cosine ≥ 0.85 for synonyms

### Memory Extraction Pattern
From `convex/memories/extract.ts`:
- LLM with zod schema validation
- Filter: importance ≥ 7, confidence ≥ 0.7
- Semantic deduplication (similarity ≥ 0.85)
- Category classification

### Junction Tables Pattern
From `convex/projects.ts` (Phase 3 migration):
```typescript
projectConversations: defineTable({
  projectId: v.id("projects"),
  conversationId: v.id("conversations"),
  userId: v.id("users"),
  addedAt: v.number(),
})
  .index("by_project", ["projectId"])
  .index("by_conversation", ["conversationId"])
```

## Technical Decisions

**File Chunking**: 1500 tokens (~6k chars), 300 token overlap
**RAG Retrieval**: Top-5 chunks, no similarity threshold
**File Limits**: 50MB hard limit, warn at 10MB
**Task Ordering**: Auto-sort by deadline (manual reorder later)
**Activity Feed**: Reactive queries (no aggregation in MVP)

## State-of-the-Art Research Summary

### Meeting Management (Otter.ai, Fireflies, Granola, Tactiq)
- Smart deadline detection: Natural language → structured dates
- Context-aware parsing: "by end of week", "next Friday"
- Urgency inference: "ASAP" = today, "urgent" = 24h
- Review workflow: Confidence scores, inline editing, bulk approval
- Hybrid approach (Granola): User notes + AI enhancement

### Workspace Tools (Notion, Linear, Height, Basecamp)
- Tab-based navigation for resource types
- Activity feeds with intelligent aggregation
- Bi-directional cross-linking with backlinks
- File RAG for semantic search (major differentiator)
- AI-generated project summaries

## File Paths Reference

### Critical Backend Files
- `convex/schema.ts` - All table definitions
- `convex/tasks.ts` - Task CRUD operations
- `convex/ai/taskExtraction.ts` - LLM extraction logic
- `convex/projects.ts` - Project junctions and resources
- `convex/files/embeddings.ts` - RAG system
- `convex/generation.ts` - Chat context injection

### Critical Frontend Files
- `src/app/(main)/assistant/page.tsx` - Smart Assistant route
- `src/app/(main)/projects/[id]/page.tsx` - Project detail
- `src/app/(main)/tasks/page.tsx` - Tasks dashboard
- `src/components/assistant/TaskReviewPanel.tsx` - Review UI
- `src/components/projects/` - Project UI components
- `src/components/tasks/` - Task UI components

## Getting Started

1. Read each phase document in order
2. Implement phases sequentially (dependencies exist)
3. Test after each phase before moving forward
4. Follow existing codebase patterns religiously
5. Use **Bun** for all package management

## Dependencies Between Phases

- Phase 1 (Schema) → Required for all subsequent phases
- Phase 2 (Tasks) → Required for Phases 5, 7, 8
- Phase 3 (Projects) → Required for Phases 6, 8
- Phase 4 (File RAG) → Required for Phase 6, 8
- Phases 5-7 (UI) → Can be done in parallel after backend complete
- Phase 8 (Integration) → Requires all previous phases

## Success Criteria

- Upload audio → transcribe → extract 5+ tasks → review → confirm
- Smart deadlines work ("next Friday" becomes correct ISO date)
- Tasks auto-tagged using existing tag system
- Memories extracted from transcripts
- Project detail view shows all linked resources
- Upload PDF to project → embedding completes → searchable in chat
- Global task dashboard with filters working
- Today view shows only tasks due today

## Estimated Timeline

- Phase 1: 1-2 days (schema + migration)
- Phase 2: 2-3 days (tasks backend)
- Phase 3: 1-2 days (project expansion)
- Phase 4: 2-3 days (file RAG)
- Phase 5: 2 days (assistant UI)
- Phase 6: 3 days (project detail UI)
- Phase 7: 2 days (tasks dashboard)
- Phase 8: 1-2 days (integration + testing)

**Total**: ~2-3 weeks for solo developer (iterative delivery)

## Support

- Main codebase docs: `docs/spec.md`, `docs/implementation/`
- Convex patterns: Existing `convex/` files
- UI patterns: Existing components in `src/components/`
- Ask questions before making assumptions
