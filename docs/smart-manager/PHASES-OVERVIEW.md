# Smart Manager - Phases Overview

## Status

**ALL PHASES IMPLEMENTED** - Verified December 2025

| Phase | Document | Status |
|-------|----------|--------|
| 1 | phase-1-schema.md | IMPLEMENTED |
| 2 | phase-2-tasks-backend.md | IMPLEMENTED |
| 3 | phase-3-projects-backend.md | IMPLEMENTED |
| 4 | phase-4-file-rag.md | IMPLEMENTED |
| 5-8 | phases-5-8-ui-integration.md | IMPLEMENTED |

**Implementation Locations:**
- Schema: `convex/schema.ts`
- Tasks: `convex/tasks.ts`, `convex/ai/taskExtraction.ts`, `convex/tasks/tags.ts`
- Projects: `convex/projects.ts`
- File RAG: `convex/files/`, `convex/files.ts`
- Assistant UI: `src/app/(main)/assistant/`
- Project Detail: `src/app/(main)/projects/[id]/`
- Tasks Dashboard: `src/app/(main)/tasks/`
- Integration: `convex/generation.ts`, `src/components/sidebar/app-sidebar.tsx`

## Remaining Phases - Quick Reference

### Phase 3: Project Expansion Backend (1-2 days)
**File**: `phase-3-projects-backend.md`

**What to Build**:
- Junction mutations: `addNoteToProject`, `removeNoteFromProject`, `addFileToProject`, `removeFileFromProject`
- Resource queries: `getProjectResources` (unified), `getProjectActivity`
- Activity event tracking
- Memory extraction with project links

**Pattern to Follow**: `convex/projects.ts` lines 115-192 (`projectConversations`)

**Key Code**:
```typescript
// convex/projects.ts (extend)
export const addNoteToProject = mutation({
  handler: async (ctx, args) => {
    // Check ownership
    // Insert junction
    // Create activity event
    // Prevent duplicates
  },
});

export const getProjectResources = query({
  handler: async (ctx, args) => {
    // Get conversations via projectConversations
    // Get notes via projectNotes
    // Get files via projectFiles
    // Get tasks via projectId field
    // Return { conversations, notes, files, tasks }
  },
});
```

**Tests**:
- Link note to project → verify junction created
- Get project resources → returns all linked items
- Activity events created on link/unlink

---

### Phase 4: File RAG System (2-3 days)
**File**: `phase-4-file-rag.md`

**What to Build**:
- `convex/files/chunking.ts`: Split documents (1500 tokens, 300 overlap)
- `convex/files/embeddings.ts`: Batch embed chunks, track status
- `convex/files/search.ts`: Semantic search via vector index
- Extend `convex/files.ts`: Status mutations (`updateEmbeddingStatus`, `insertFileChunk`)

**Pattern to Follow**: `convex/messages/embeddings.ts` (batch embedding, vector search)

**Key Decisions**:
- Chunk size: 1500 tokens (~6k chars)
- Overlap: 300 tokens
- Embedding model: text-embedding-3-small (1536-dim)
- Top-K retrieval: 5 chunks for project context

**Tests**:
- Upload file → chunks created → embeddings generated → status "completed"
- Search "authentication" → relevant chunks returned
- Project context includes file chunks

---

### Phase 5: Smart Assistant UI (2 days)
**File**: `phase-5-assistant-ui.md`

**What to Build**:
- `src/app/(main)/assistant/page.tsx`: Upload flow, state machine
- `src/components/assistant/TaskReviewPanel.tsx`: Review UI with confidence badges
- Processing states: idle → transcribing → extracting → reviewing → confirmed

**Pattern to Follow**: Existing file upload (`src/components/chat/FileUpload.tsx`)

**Key Features**:
- Audio/transcript upload
- Real-time transcription progress
- Task extraction with inline editing
- Bulk confirm/reject
- Confidence score visualization

**Tests**:
- Upload audio → transcribe → extract 5 tasks → review → confirm
- Edit task before confirming
- Reject low-confidence tasks

---

### Phase 6: Project Detail View (3 days)
**File**: `phase-6-project-detail.md`

**What to Build**:
- `src/app/(main)/projects/[id]/page.tsx`: Tabbed layout
- `src/components/projects/ProjectOverview.tsx`: Stats + activity feed
- `src/components/projects/ProjectConversations.tsx`: List + add dialog
- `src/components/projects/ProjectFiles.tsx`: Upload + RAG status
- `src/components/projects/ProjectNotes.tsx`: Link notes dialog
- `src/components/projects/ProjectTasks.tsx`: Task list
- `src/components/projects/ActivityFeed.tsx`: Real-time events

**Pattern to Follow**: `src/app/(main)/notes/page.tsx` (tab structure, filters)

**Key Features**:
- Tab navigation (Overview, Conversations, Files, Notes, Tasks)
- File upload with 10MB warning, 50MB limit
- Embedding status indicators
- Activity feed with grouping (Today, Yesterday, This Week)

**Tests**:
- Create project → link resources → tabs show correct counts
- Upload file → status "Processing" → "Indexed"
- Activity feed updates in real-time

---

### Phase 7: Tasks Dashboard (2 days)
**File**: `phase-7-tasks-dashboard.md`

**What to Build**:
- `src/app/(main)/tasks/page.tsx`: Global task views
- `src/components/tasks/TaskList.tsx`: Card list with checkboxes
- `src/components/tasks/CreateTaskDialog.tsx`: Manual task creation
- `src/components/tasks/TaskFilters.tsx`: Project, tag, status filters

**Pattern to Follow**: `src/app/(main)/notes/page.tsx`

**Key Features**:
- Views: All, Today, Upcoming, Completed
- Filters: Project dropdown, tag multi-select, search
- Quick complete via checkbox
- Badges: urgency, deadline (relative time), confidence

**Tests**:
- Today view shows only today's tasks
- Filter by project works
- Complete task → moves to completed view
- Tag filter works (multi-select)

---

### Phase 8: Integration & Testing (1-2 days)
**File**: `phase-8-integration.md`

**What to Build**:
- Extend `convex/generation.ts`: Inject project context (RAG)
- Update `src/components/sidebar/Sidebar.tsx`: Add /assistant, /tasks links
- Comprehensive test scenarios
- Bug fixes and polish

**Key Integration Points**:
- Chat uses project file RAG for context
- Smart Assistant triggers memory extraction
- Project context includes tasks + file chunks
- Navigation between features

**Critical Tests**:
1. Smart Assistant: Upload → extract → tag → remember
2. Project Workspace: Link all resources → RAG search works
3. Tasks Dashboard: All views + filters functional
4. File RAG: Project chat uses file content in responses

---

## How to Generate Remaining Phases

### Option 1: On-Demand (Recommended)
Ask Claude to generate each phase as you need it:
```
Generate phase-3-projects-backend.md following the pattern of phase-1 and phase-2.
Include full context, code examples, patterns, and tests.
```

### Option 2: Batch Generation
Ask Claude to generate all remaining phases:
```
Generate phases 3-8 following the structure of phase-1 and phase-2.
Create separate MD files for each phase with full context.
```

### Option 3: Manual Creation
Use this overview as a template and fill in details from:
- README.md (patterns, decisions)
- Existing phases (structure)
- Main plan: `/Users/bhekanik/.claude/plans/mossy-rolling-quilt.md`

## Each Phase Should Include

1. **Overview**: Duration, dependencies, output
2. **Context**: What we're building, why it matters
3. **Existing Patterns**: Files to reference, code snippets
4. **Implementation**: Step-by-step with code examples
5. **Testing**: Manual tests, success criteria
6. **Next Phase**: Brief preview
7. **Reference Files**: Paths to existing code

## Verification Checklist

For each phase document:
- [ ] Self-contained (no references to conversation)
- [ ] Includes all necessary context
- [ ] Code examples are complete and functional
- [ ] Patterns reference existing codebase files
- [ ] Testing section is comprehensive
- [ ] Success criteria are clear and measurable

## Template Structure

```markdown
# Phase X: [Name]

## Overview
- Duration
- Dependencies
- Output

## Context: What We're Building
- High-level feature description
- Why this phase matters

## Existing Patterns to Follow
- Reference files with line numbers
- Code snippets showing patterns

## Implementation
- Step-by-step instructions
- Complete code examples
- File paths (absolute)

## Testing
- Manual test scenarios
- Expected outputs
- Debugging tips

## Success Criteria
- [ ] Checkboxes for deliverables

## Next Phase
- Brief preview

## Reference Files
- List of relevant existing files
```

## Quick Start

1. Read README.md for overall context
2. Implement Phase 1 (schema)
3. Test Phase 1 before moving on
4. Generate/implement Phase 2
5. Continue sequentially through phases
6. Run comprehensive tests after Phase 8

## Need Help?

- Check existing phase docs for patterns
- Reference main plan: `.claude/plans/mossy-rolling-quilt.md`
- Look at existing codebase files mentioned in each phase
- Ask Claude to generate specific phases on-demand
