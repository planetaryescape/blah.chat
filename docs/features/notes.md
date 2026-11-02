# Notes System Documentation

## Overview

The Notes system is a markdown-based note-taking feature integrated into blah.chat. It allows users to capture ideas, save message summaries, and organize information with AI-assisted tagging.

**Core Philosophy**: Resilient, markdown-native, AI-augmented, never lose data.

---

## Architecture Overview

### Data Flow

```
User Input → Tiptap Editor → Markdown → Convex Mutation → Database
                                     ↓
                                 HTML Cache (server-side)
                                     ↓
                              AI Tag Extraction (async)
```

### Core Components

1. **Storage Layer**: Convex database with markdown as source of truth
2. **Editor Layer**: Tiptap with markdown extensions
3. **AI Layer**: OpenRouter for tag extraction and summarization
4. **UI Layer**: React components with mobile-responsive design

---

## Key Architectural Decisions

### 1. Markdown as Source of Truth

**Decision**: Store markdown in the database, HTML as a cached derivative.

**Rationale**:
- **Portability**: Markdown is universal, future-proof
- **Editability**: Can be edited in any editor, version controlled
- **Security**: Easier to sanitize than arbitrary HTML
- **Performance**: HTML cache enables fast rendering without runtime parsing

**Implementation**:
- `content` field: markdown (source of truth)
- `htmlContent` field: server-generated HTML cache
- HTML regenerated on every content save
- DOMPurify sanitization at generation time (server-side)

**Future Considerations**:
- If moving to different editor, markdown remains portable
- Can export/import notes as plain .md files
- HTML cache is optional optimization - can be regenerated anytime

---

### 2. Dual Storage Strategy (Content + HTML Cache)

**Decision**: Store both markdown and pre-rendered HTML.

**Rationale**:
- **Performance**: Skip markdown→HTML conversion on every render
- **Consistency**: Server controls rendering, not client browser differences
- **Security**: Sanitization happens once at save time, not every view

**Implementation**:
- `markdownToHtml()` function in `convex/notes.ts` (server-side)
- Basic regex-based conversion (no DOMPurify on server - Node.js doesn't have DOM)
- Client-side rendering uses Tiptap (which handles markdown natively)

**Gotcha**: Server-side HTML cache is a simple fallback. Primary rendering happens via Tiptap on client. HTML cache could be used for SSR or email exports in future.

---

### 3. Source Tracking (Provenance)

**Decision**: Optionally track which message/conversation a note came from.

**Rationale**:
- **Context**: Users can see "where did this note come from?"
- **Navigation**: Potential future feature to jump back to source conversation
- **Analytics**: Understand how users create notes (from messages vs. scratch)

**Implementation**:
- `sourceMessageId`, `sourceConversationId`, `sourceSelectionText` (all optional)
- No foreign key constraints - allows message deletion without breaking notes
- Flexible: notes can exist independently of conversations

**Future Enhancements**:
- "Jump to source" button in note editor
- Filter notes by conversation
- Show conversation context in note preview

---

### 4. Auto-Title Extraction

**Decision**: Automatically extract title from first line of content.

**Rationale**:
- **Friction Reduction**: Users don't have to think about naming notes
- **Natural Workflow**: Write first, organize later
- **Consistency**: First line = title is a common pattern (email, Notion, etc.)

**Implementation**:
- Extract first line, remove markdown heading syntax (`#`)
- Fallback: "Untitled Note"
- User can override by editing title field
- Once user manually sets title, auto-extraction doesn't override

**Gotcha**: Title field can drift from first line if user manually edits. This is intentional - respects user choice.

---

### 5. Hybrid Tagging System (Human + AI)

**Decision**: AI suggests tags, user accepts/rejects/adds manually.

**Rationale**:
- **Efficiency**: AI does the initial work
- **Control**: User has final say
- **Trust**: Users can see and modify AI suggestions
- **Flexibility**: Users can add tags AI missed

**Implementation**:
- `suggestedTags`: AI-generated, shown as chips with "+" button
- `tags`: User-accepted or manually added tags
- Clear separation in schema and UI
- Tag extraction runs asynchronously after note save

**Lifecycle**:
1. User creates/updates note → content saved immediately
2. Background job schedules tag extraction (if content ≥ 50 chars)
3. AI generates suggestions → updates `suggestedTags` field
4. User clicks "+" on suggestion → moves to `tags`, removed from `suggestedTags`
5. User manually adds tag → goes directly to `tags`

**Cost Optimization**:
- Uses OpenRouter with Grok 4.1 Fast (cheaper than GPT-4)
- Only extracts when content ≥ 50 characters
- Max 5 tags per note
- Skips extraction on trivial edits

**Future Enhancements**:
- Batch tag extraction for multiple notes
- Learn from user accept/reject patterns
- Tag similarity clustering

---

### 6. Ephemeral Popover (Not Persistent Messages)

**Decision**: Summaries appear in popover, not as system messages in chat.

**Rationale**:
- **Clean History**: Doesn't clutter conversation with AI summaries
- **Ephemeral Nature**: Summary is useful once, then disposable
- **User Choice**: Explicit "Save as Note" action required
- **Flexibility**: Can dismiss without saving

**Previous Design (Rejected)**:
- Inserted system message with summary into conversation
- Problem: Polluted chat history, hard to remove, felt invasive

**Implementation**:
- `SummarizePopover` component shows summary in floating dialog
- Positioned near text selection
- Two outcomes: "Save as Note" or "Dismiss"
- State resets on close (no persistence)

**Gotcha**: Popover position calculation must account for scroll offset (`window.scrollY`). State must be explicitly reset to prevent auto-trigger on next selection.

---

### 7. Overflow Menu Pattern (Message Actions)

**Decision**: Visible actions (high-frequency) + overflow menu (low-frequency).

**Rationale**:
- **Simplicity**: Avoid horizontal button sprawl
- **Discoverability**: Common actions always visible
- **Safety**: Destructive actions hidden in menu
- **Mobile-Friendly**: Touch targets appropriately sized

**Desktop Layout**:
- Visible: Copy, Bookmark, Save as Note
- Overflow (⋯): Regenerate, Branch, Delete
- Conditional: Retry/Stop replace Regenerate when applicable

**Mobile Layout**:
- All actions in single dropdown menu
- Detected via `useMobileDetect` hook (768px breakpoint)
- Component: `MessageActionsMenuMobile`

**Future Considerations**:
- User preferences for which actions are visible
- Reorderable action buttons
- Custom shortcuts

---

### 8. Auto-Save with Debounce

**Decision**: Save automatically 2 seconds after last keystroke.

**Rationale**:
- **Data Safety**: Never lose work due to crashes/refreshes
- **Performance**: Avoid excessive DB writes while typing
- **UX**: No manual "Save" button cognitive load
- **Network Efficiency**: Batch rapid edits into single mutation

**Implementation**:
- `useRef` for timeout tracking
- Clear timeout on new keystroke
- Clear timeout on unmount (prevent memory leaks)
- Manual save (Cmd+S) bypasses debounce, saves immediately

**Save Indicators**:
- "Saving..." during mutation
- "Saved [HH:MM]" after success
- User confidence: changes are persisted

**Gotcha**: Initial content load must set flag to skip auto-save trigger. Otherwise, loading a note triggers immediate save.

---

### 9. Virtual Scrolling (Performance)

**Decision**: Use `@tanstack/react-virtual` for note list.

**Rationale**:
- **Scalability**: Handle 1000+ notes without lag
- **Performance**: Only render visible items + overscan
- **Smooth Scrolling**: No jank with large datasets
- **Future-Proof**: System can scale to power users

**Implementation**:
- `estimateSize: () => 100` (dynamic height calculation)
- `overscan: 5` (render 5 items above/below viewport)
- Absolute positioning with transform (GPU-accelerated)
- Works with search/filter (re-virtualizes results)

**Trade-offs**:
- Complexity: More complex than simple `.map()`
- Animation Conflicts: Exit animations can conflict with absolute positioning
- Estimated Height: Must be reasonably accurate or scrolling feels janky

**Future Enhancements**:
- Pagination for search results (if search becomes slow)
- Infinite scroll (load more notes on scroll)
- Dynamic height measurement (for variable-height notes)

---

### 10. Mobile-First Responsive Design

**Decision**: Desktop shows sidebar + editor split, mobile shows one or the other.

**Rationale**:
- **Screen Real Estate**: Mobile can't fit both comfortably
- **Focus**: One thing at a time on small screens
- **Navigation**: Back button is familiar mobile pattern
- **Progressive Enhancement**: Desktop gets full power, mobile stays usable

**Implementation**:
- `useMobileDetect` hook (768px breakpoint)
- State: `mobileView: "list" | "editor"`
- Back button in editor header on mobile
- Dynamic viewport height (`100dvh`) handles mobile browser UI

**Future Considerations**:
- Tablet breakpoint (between mobile and desktop)
- Landscape mode on mobile
- Bottom sheet for tags on mobile (instead of inline)

---

## Integration Points

### With Chat System

1. **Message Actions**: "Save as Note" button on every message
2. **Summarize Popover**: Select text → Summarize → Save as Note
3. **Source Tracking**: Notes remember which message/conversation they came from

**Event-Driven Communication**:
- Custom events bridge components without prop drilling
- `window.dispatchEvent(new CustomEvent("save-message-as-note", { detail: { messageId } }))`
- Event listeners in `MessageActions` component

### With AI System

1. **Tag Extraction**: Background Convex action calls OpenRouter
2. **Summarization**: Convex action generates summary from selected text
3. **Cost Optimization**: Uses cheaper models (Grok 4.1 Fast) for non-critical AI

**Async Architecture**:
- Actions (AI calls) scheduled via `ctx.scheduler.runAfter()`
- Non-blocking: note saves immediately, AI runs in background
- Error handling: AI failures don't break note creation

### With Search System

1. **Full-Text Search**: Convex search index on `content` field
2. **Pinned Filter**: Client-side filtering on `isPinned` boolean
3. **Recent Notes**: Query by `updatedAt` when no search query

**Future Enhancements**:
- Tag-based filtering
- Hybrid search (full-text + semantic/vector)
- Search across conversations + notes

---

## Data Schema

### Notes Table

```typescript
notes: {
  userId: Id<"users">,              // Owner
  title: string,                     // Auto-extracted or user-set
  content: string,                   // Markdown (source of truth)
  htmlContent?: string,              // Cached HTML

  // Source tracking
  sourceMessageId?: Id<"messages">,
  sourceConversationId?: Id<"conversations">,
  sourceSelectionText?: string,

  // Tags
  tags?: string[],                   // User-accepted tags
  suggestedTags?: string[],          // AI-generated suggestions

  // Metadata
  isPinned: boolean,
  shareId?: string,                  // For public sharing (future)
  isPublic?: boolean,

  createdAt: number,
  updatedAt: number,
}
```

### Indexes

- `by_user`: Query user's notes
- `by_user_updated`: Sort by recency
- `by_source_message`: Optional cleanup queries
- `by_share_id`: Public note access (future)
- `search_notes`: Full-text search on content

---

## Security Considerations

### XSS Prevention

1. **Input Sanitization**: Tiptap configured with `html: false` (no raw HTML in markdown)
2. **Output Sanitization**: Server-side HTML cache generation with allowed tags only
3. **Defense in Depth**: Both input and output protection

### Authentication

- All mutations verify ownership via `getCurrentUserId()`
- Queries check `note.userId === currentUserId`
- No public access yet (future: shareId-based sharing)

### Rate Limiting

- AI tag extraction only on content ≥ 50 chars (prevents spam)
- Scheduled async (doesn't block note creation)
- Future: Rate limit per user for AI operations

---

## Performance Optimizations

### Implemented

1. **Virtual Scrolling**: Handle 1000+ notes
2. **HTML Cache**: Skip markdown parsing on every render
3. **Debounced Save**: Reduce DB writes
4. **Lazy Tag Extraction**: Async, non-blocking
5. **Search Index**: Fast full-text search

### Future Optimizations

1. **Pagination**: Limit query results, load more on scroll
2. **Incremental Loading**: Load recent notes first, older on demand
3. **Edge Caching**: CDN for public shared notes
4. **Batch AI Operations**: Extract tags for multiple notes in one call

---

## Common Patterns

### Creating a Note

```typescript
// From message
const noteId = await createNote({
  content: message.content,
  sourceMessageId: message._id,
  sourceConversationId: message.conversationId,
});

// From scratch
const noteId = await createNote({
  content: "# New Note\n\nStart writing...",
  title: "New Note",
});
```

### Updating a Note

```typescript
// Content change triggers:
// 1. HTML cache regeneration
// 2. Auto-title extraction (if title not provided)
// 3. Tag re-extraction (if content ≥ 50 chars)
await updateNote({
  noteId,
  content: newMarkdown,
});
```

### Tag Management

```typescript
// Accept AI suggestion
await acceptTag({ noteId, tag: "javascript" });

// Manual add
await addTag({ noteId, tag: "important" });

// Remove
await removeTag({ noteId, tag: "old-tag" });
```

---

## Debugging Guide

### Auto-Save Not Triggering

**Check**:
1. Is `isInitialLoad` flag still true? (Should flip to false after mount)
2. Is timeout being cleared before it fires? (Check debounce timing)
3. Is editor `onUpdate` callback firing? (Add console.log)

### Tags Not Appearing

**Check**:
1. Is content ≥ 50 characters? (Extraction skips short notes)
2. Check Convex logs for scheduled actions (AI failures silent)
3. Is OpenRouter API key set? (AI calls fail without key)
4. Are suggested tags being replaced on re-extraction? (Expected behavior)

### Search Not Working

**Check**:
1. Is search index deployed? (Check Convex dashboard)
2. Is query non-empty? (Empty query returns recent notes)
3. Are results filtered by userId? (Should only see own notes)

### Mobile Layout Broken

**Check**:
1. Is `isMobile` detecting correctly? (Check hook implementation)
2. Is `mobileView` state persisting across navigations? (Should reset)
3. Is back button updating state? (Should set `mobileView: "list"`)

---

## Future Enhancement Roadmap

### Near-Term (Next Phases)

1. **Public Sharing**: Share notes via unique URL
2. **Export/Import**: Download as .md files, bulk import
3. **Templates**: Pre-made note structures
4. **Attachments**: Images, files embedded in notes

### Medium-Term

1. **Collaborative Editing**: Real-time co-editing (Convex presence)
2. **Version History**: Snapshots on major edits
3. **Semantic Search**: Vector embeddings + hybrid search
4. **Folders/Hierarchy**: Organize notes in tree structure

### Long-Term

1. **Plugins**: Extensible note editor (similar to Obsidian)
2. **API Access**: External integrations
3. **Mobile Apps**: Native iOS/Android with offline sync
4. **AI Writing Assistant**: Autocomplete, rewrite, expand

---

## Testing Checklist

### Core Functionality

- [ ] Create note (from scratch, from message, from summary)
- [ ] Update note (content, title, tags)
- [ ] Delete note
- [ ] Auto-save triggers after 2 seconds
- [ ] Manual save (Cmd+S) works
- [ ] Pin/unpin note

### AI Features

- [ ] Tag extraction runs on create (≥50 chars)
- [ ] Tag extraction re-runs on content update
- [ ] Summarize popover generates summary
- [ ] Can save summary as note
- [ ] Suggested tags appear in UI
- [ ] Can accept/reject suggested tags

### Search & Filters

- [ ] Full-text search returns relevant results
- [ ] Empty search returns recent notes
- [ ] Pinned filter works
- [ ] Search + pinned filter compose correctly

### Mobile Responsiveness

- [ ] List view renders on mobile
- [ ] Can switch to editor view
- [ ] Back button returns to list
- [ ] Keyboard doesn't break layout
- [ ] Virtual scrolling smooth on mobile

### Edge Cases

- [ ] Note with no content (title still extracts)
- [ ] Very long note (10,000+ characters)
- [ ] Note with only whitespace
- [ ] Special characters in title/content
- [ ] Rapid typing (auto-save doesn't fire too often)
- [ ] Page refresh mid-save (data not lost)

---

## Gotchas & Known Issues

### Title Drift

**Issue**: Title field can become out of sync with first line.

**Cause**: If user manually edits title, auto-extraction stops respecting it.

**Resolution**: Intentional behavior. User choice overrides automation.

**Future**: Consider "Reset Title" button to re-sync with first line.

---

### Suggested Tags Replacement

**Issue**: Re-extracting tags replaces ALL suggested tags, not merges.

**Cause**: LLM generates fresh set on each call.

**Resolution**: Expected behavior. AI doesn't remember previous suggestions.

**Future**: Consider merging new suggestions with old (deduplicating).

---

### HTML Cache Not Used

**Issue**: Client doesn't render from `htmlContent` field.

**Cause**: Tiptap handles markdown natively, renders on client.

**Resolution**: HTML cache is for future SSR or exports, not current rendering.

**Future**: Use HTML cache for email exports, public shared notes (SSR).

---

### Auto-Save on Load

**Issue**: Loading a note triggered auto-save immediately.

**Cause**: Setting editor content fires `onUpdate` callback.

**Resolution**: `isInitialLoad` flag prevents first save.

**Future**: Consider more robust "dirty" state tracking.

---

### Popover Auto-Trigger Bug (FIXED)

**Issue**: Popover appeared immediately on next text selection.

**Cause**: State not reset before next render.

**Resolution**: Explicit state reset with `setTimeout(0)` ensures clean state.

**Lesson**: React state updates aren't always synchronous. Use microtask queue for guaranteed ordering.

---

## Maintenance Notes

### When Changing Schema

1. Update `convex/schema.ts`
2. Deploy schema (`npx convex deploy`)
3. Update TypeScript types (`Doc<"notes">`)
4. Update mutations/queries using the field
5. Test with existing data (migrations needed?)

### When Adding AI Features

1. Use `ctx.scheduler.runAfter()` for non-blocking
2. Error handling: AI calls can fail
3. Cost tracking: Monitor OpenRouter usage
4. User control: AI suggests, user decides

### When Optimizing Performance

1. Profile first: Measure before optimizing
2. Virtual scrolling already handles scale
3. Consider pagination for very large datasets
4. Batch operations when possible (tag extraction)

### When Debugging

1. Check Convex logs (scheduled actions run silently)
2. Verify auto-save debounce timing
3. Test with large datasets (performance edge cases)
4. Mobile testing: Keyboard, scrolling, touch targets

---

## Credits & Context

This notes system was implemented iteratively across 7 phases:

1. **Phase 1**: Schema & CRUD - Foundation
2. **Phase 2**: Message Actions - Integration with chat
3. **Phase 3**: Summarize Popover - Ephemeral UI pattern
4. **Phase 4**: Rich Editor - Tiptap with auto-save
5. **Phase 5**: Tags & Search - AI-assisted organization
6. **Phase 6**: (Skipped - reserved for sharing)
7. **Phase 7**: Polish - Mobile, performance, animations

**Design Philosophy**: Build incrementally, test early, optimize later. Each phase adds value independently while composing into a cohesive system.

**Key Decisions Were Driven By**:
- User data safety (never lose work)
- Performance at scale (virtual scrolling, caching)
- AI augmentation without AI dependence (hybrid tags)
- Mobile-first responsive design
- Clean, clutter-free UX (ephemeral popover vs. persistent messages)

---

## Resources

- **Tiptap Docs**: https://tiptap.dev
- **Convex Docs**: https://docs.convex.dev
- **React Virtual**: https://tanstack.com/virtual/latest
- **Framer Motion**: https://www.framer.com/motion

---

**Last Updated**: 2025-01-07
**Maintained By**: blah.chat team
