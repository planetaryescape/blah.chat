# blah.chat Implementation Guide

Complete phased implementation plan for building a production-quality personal AI chat assistant.

---

## Overview

blah.chat is a self-hosted AI chat application with full control over chat experience, cost tracking, multi-provider support, and a custom RAG memory system.

**Key Differentiators**:
- **Resilient Generation**: Responses survive page refresh/tab close
- **RAG Memory System**: AI remembers facts about you across conversations
- **Multi-Provider**: 10+ models from OpenAI, Anthropic, Google, Ollama
- **Cost Visibility**: Track every penny spent
- **Data Ownership**: Full export/import control

---

## Tech Stack

- **Framework**: Next.js 15 (App Router), TypeScript
- **Database**: Convex (real-time, built-in vector search)
- **Auth**: Clerk
- **AI**: Vercel AI SDK (OpenAI, Anthropic, Google, Ollama)
- **UI**: shadcn/ui, Tailwind CSS, Framer Motion
- **Analytics**: PostHog
- **Logging**: Pino

---

## Implementation Phases

### **Phase 0: Design System** (Foundation)
📄 [phase-0-design-system.md](./phase-0-design-system.md)

Establish visual identity. Typography, colors, motion principles. **Critical**: Avoid generic AI aesthetic.

**Deliverables**: Distinctive theme, design tokens, component overrides

---

### **Phase 1: Auth & Convex** (Infrastructure)
📄 [phase-1-auth-convex.md](./phase-1-auth-convex.md)

Set up Clerk authentication + Convex database. User sync via webhook.

**Deliverables**: Working auth, Convex schema, protected routes

---

### **Phase 2A: Resilient Chat** ⭐ CRITICAL
📄 [phase-2a-resilient-chat.md](./phase-2a-resilient-chat.md)

Core chat with **server-side generation** that survives disconnection. Test: send message → close tab → response completes.

**Deliverables**: LLM generation via Convex actions, progressive updates, cost tracking

**Test**: Refresh mid-generation ✓

---

### **Phase 2B: Chat UX**
📄 [phase-2b-chat-ux.md](./phase-2b-chat-ux.md)

Polish UI. Markdown, syntax highlighting, message actions, keyboard shortcuts.

**Deliverables**: Beautiful messages, copy/regenerate/edit/delete, auto-scroll

---

### **Phase 2C: Conversations**
📄 [phase-2c-conversations.md](./phase-2c-conversations.md)

Sidebar with conversation management. Create, rename, delete, archive, search.

**Deliverables**: Functional sidebar, CRUD operations, auto-titles

---

### **Phase 3: Multi-Model** ⭐ KEY FEATURE
📄 [phase-3-multi-model.md](./phase-3-multi-model.md)

Support 10+ models from 4 providers. Model selector, thinking effort control.

**Deliverables**: OpenAI, Anthropic, Google, Ollama integrated, model switching works

---

### **Phases 4-7: Rich Features**
📄 [phase-4-7-rich-features.md](./phase-4-7-rich-features.md)

**Phase 4**: File uploads (images, PDFs) + voice input
**Phase 5**: RAG memory system (extraction, retrieval, injection) ⭐ KILLER FEATURE
**Phase 6**: Hybrid search (full-text + vector) + projects + templates
**Phase 7**: Cost tracking + usage dashboard + budgets

---

### **Phases 8-11: Advanced & Polish**
📄 [phase-8-11-advanced-polish.md](./phase-8-11-advanced-polish.md)

**Phase 8**: Context window visibility + conversation branching
**Phase 9**: Bookmarks, response comparison, image generation, TTS
**Phase 10**: Export/import (JSON/Markdown/ChatGPT), shareable links, scheduled prompts
**Phase 11**: Command palette, keyboard shortcuts, PostHog, animations, error boundaries, performance

---

## Getting Started

1. **Read spec**: [Project spec in main plan](../../README.md)
2. **Phase 0**: Design review - show 2-3 visual concepts for approval
3. **Phase 1**: Set up infrastructure
4. **Phase 2A**: Build resilient chat (most critical)
5. **Continue sequentially**: Each phase builds on previous

---

## Critical Checkpoints

### After Phase 2A (MVP)
- [ ] Can send messages
- [ ] Responses stream in
- [ ] **Refresh test passes** (close tab → response completes)
- [ ] Cost tracked per message

### After Phase 3 (Core Complete)
- [ ] 10+ models working
- [ ] Can switch models mid-conversation
- [ ] Model-specific features work (thinking effort)

### After Phase 7 (Feature Complete)
- [ ] Memory system recalls facts
- [ ] Search finds past conversations
- [ ] Projects organize work
- [ ] Cost dashboard accurate

### After Phase 11 (Production Ready)
- [ ] Keyboard-driven workflow fast
- [ ] All data exportable
- [ ] Zero frustrating bugs
- [ ] Analytics tracking
- [ ] Performance optimized

---

## Key Technical Patterns

### Resilient Generation (Phase 2A)
```
User sends → Mutation creates message → Schedule action
Action runs independently → Updates DB progressively
Client reconnects → Sees completed response
```

### Hybrid Search (Phase 6)
```
Full-text search (keywords) + Vector search (semantic)
Merge with RRF (Reciprocal Rank Fusion)
Filter by date/project/tags
```

### Memory System (Phase 5)
```
Extract facts → Generate embeddings → Store with vector index
On new message → Search relevant memories → Inject into prompt
```

### Cost Tracking (Phase 7)
```
Per-message: tokens → cost calculation → storage
Daily aggregation: sum by model/user
Dashboard: queries on aggregates
```

---

## Environment Variables

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Convex
NEXT_PUBLIC_CONVEX_URL=https://...convex.cloud
CONVEX_DEPLOY_KEY=...

# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...

# Ollama (optional)
OLLAMA_BASE_URL=http://localhost:11434/v1

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=...

# Logging
LOG_LEVEL=info
```

---

## Testing Strategy

### Per Phase
- Test acceptance criteria before moving forward
- No broken windows - fix issues immediately

### Critical Tests
1. **Resilient generation** (Phase 2A): Close tab mid-generation → response completes
2. **Model switching** (Phase 3): Change model → send message → correct model used
3. **Memory recall** (Phase 5): Tell AI fact → new chat → AI remembers
4. **Cost accuracy** (Phase 7): Send messages → verify cost calculations
5. **Export/import** (Phase 10): Export data → import → verify integrity

---

## Common Pitfalls

⚠️ **10-min Convex action limit**: For extremely long generations, implement chunking or external job queue

⚠️ **Generic AI aesthetic**: Review design in Phase 0 before implementing

⚠️ **Memory extraction cost**: Use gpt-4o-mini, not gpt-4o

⚠️ **Embedding costs**: Generate async, batch for backfills

⚠️ **Context window exhaustion**: Implement Phase 8 truncation early

---

## Success Metrics

**After MVP (Phase 3)**:
- Can chat with multiple models ✓
- Refresh test passes ✓
- Feels distinctive (not generic) ✓

**After Core (Phase 7)**:
- Memory system works ✓
- Search finds past chats ✓
- Cost tracking accurate ✓

**Production (Phase 11)**:
- Daily driver quality ✓
- Keyboard-first workflow ✓
- Zero data loss ✓

---

## Support & Resources

**Documentation**:
- Convex: https://docs.convex.dev
- Vercel AI SDK: https://sdk.vercel.ai
- Clerk: https://clerk.com/docs
- shadcn/ui: https://ui.shadcn.com

**Research Findings**:
- Resilient generation patterns: See Phase 2A notes
- Hybrid search implementation: See Phase 6 notes
- RAG memory systems: See Phase 5 notes
- Cost tracking architecture: See Phase 7 notes

---

## Questions?

Each phase document includes:
- Detailed tasks
- Code examples
- Schema definitions
- Acceptance criteria
- Troubleshooting

**Start with Phase 0** - design decisions set the tone for everything else.

---

Built with ❤️ for serious, production-quality personal AI tools.
