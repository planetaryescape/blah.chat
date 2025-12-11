# API Layer Migration - Implementation Guide

## Project Overview

**blah.chat** is migrating from direct Convex client access to an API-first architecture to enable mobile app development while maintaining optimal web performance.

### The Grand Vision

Build a **hybrid architecture** that gives us the best of both worlds:
- **Web app**: Lightning-fast Convex reactive queries (no changes needed!)
- **Mobile app**: REST API with SSE streaming + light polling
- **Both platforms**: Share mutation endpoints, envelope pattern, structured logging

This allows us to ship a mobile app incrementally while keeping the web experience optimal.

---

## Why This Migration?

### Current State (Web Only)

```
Web Client (React)
       ↓
   useQuery, useMutation (Convex hooks)
       ↓
   Convex Server
       ↓
   Database
```

**Problems**:
- Mobile apps can't use Convex hooks (client-side only)
- No HTTP API layer for external integrations
- Tight coupling between client and database

### Target State (Web + Mobile)

```
┌─────────────┐                    ┌─────────────┐
│  Web Client │                    │Mobile Client│
│   (React)   │                    │(React Native│
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │ useQuery (Convex)          HTTP │ API
       │ for real-time          ┌─────────┘
       │                        │
       ├────────────────────────┤
       │                        │
       v                        v
┌──────────────────────────────────────┐
│      Next.js API Routes              │
│  - Envelope pattern                  │
│  - Auth middleware (Clerk)           │
│  - Logging (Pino)                    │
│  - Validation (Zod)                  │
└──────────────┬───────────────────────┘
               │
               v
┌──────────────────────────────────────┐
│     Data Access Layer (DAL)          │
│  - fetchQuery, fetchMutation         │
│  - Authorization logic               │
└──────────────┬───────────────────────┘
               │
               v
┌──────────────────────────────────────┐
│         Convex Server                │
│  - Queries, Mutations, Actions       │
│  - Scheduler (resilient generation)  │
└──────────────────────────────────────┘
```

**Benefits**:
✅ Mobile app support (iOS/Android)
✅ External API for integrations
✅ Unified auth and logging
✅ Type-safe endpoints
✅ Gradual migration (no big bang)

---

## Strategic Decisions

### 1. Hybrid Real-Time Approach

**Decision**: Keep Convex `useQuery` for web, use HTTP API for mobile

**Why**:
- Convex reactive queries are instant (WebSocket-based subscriptions)
- Mobile can use polling (5-10s intervals) + SSE for streaming
- Best performance for web, acceptable for mobile
- Avoids rebuilding Convex's real-time infrastructure

**Trade-off accepted**: Mobile updates have 5-10s delay (vs instant on web)

### 2. Server-Sent Events (SSE) for Streaming

**Decision**: Use SSE for active message streaming (ChatGPT pattern)

**Why** (Research-backed):
- Industry standard: ChatGPT, Claude, Perplexity all use SSE
- **Lower complexity** than polling (built-in reconnection)
- **Better battery life**: 50-90% less bandwidth, fewer radio activations
- **Mobile-friendly**: Handles network switching gracefully
- One-way streaming perfect for LLM responses

**Source**: 2024-2025 research on ChatGPT architecture, mobile battery optimization studies

### 3. Envelope Pattern

**Decision**: Wrap all API responses in consistent envelope format

**Format**:
```json
{
  "status": "success",
  "sys": {
    "id": "abc123",
    "entity": "conversation",
    "timestamp": "2025-01-10T..."
  },
  "data": { ... }
}
```

**Why**:
- Predictable response structure
- Easy error handling
- Metadata tracking (entity type, timestamps)
- Follows best practices from ENVELOPE_PATTERN_IMPLEMENTATION.md

### 4. Incremental Rollout

**Decision**: Ship endpoints incrementally, mobile-critical first

**Priority**:
1. Core chat (send message, list conversations)
2. User preferences
3. Search and notes
4. Full parity over time

**Why**:
- Ship mobile v1 fast (15-20 endpoints)
- Validate patterns early
- Reduce risk
- Iterate based on feedback

---

## Implementation Phases

| Phase | Goal | Duration | Status |
|-------|------|----------|--------|
| [Phase 0](./phase-0-foundation.md) | Build API infrastructure | 3 weeks | Not started |
| [Phase 1](./phase-1-mutations.md) | Migrate mutations to API | 6 weeks | Not started |
| [Phase 2](./phase-2-react-query.md) | Setup React Query | 2 weeks | Not started |
| [Phase 3](./phase-3-queries.md) | Migrate mobile-critical queries | 6 weeks | Not started |
| [Phase 4](./phase-4-actions.md) | Wrap Convex actions | 2 weeks | Not started |
| [Phase 5](./phase-5-real-time.md) | Implement SSE + polling | 2 weeks | Not started |
| [Phase 6](./phase-6-resilient-gen.md) | Validate resilient generation | 1 week | Not started |
| [Phase 7](./phase-7-performance.md) | Optimize caching | 2 weeks | Not started |
| [Phase 8](./phase-8-documentation.md) | API docs + mobile guide | 2 weeks | Not started |

**Total**: ~24 weeks (~6 months)

---

## Technology Stack

### Backend
- **Next.js 15**: API routes (App Router)
- **Convex**: Database, real-time, actions
- **Clerk**: Authentication
- **Pino**: Structured logging
- **Zod**: Validation

### Frontend (Web)
- **React 19**: UI framework
- **Convex hooks**: Real-time queries (unchanged)
- **React Query**: API mutations
- **TypeScript**: Type safety

### Frontend (Mobile)
- **React Native** (future)
- **React Query**: HTTP client
- **EventSource**: SSE connections
- **Platform-specific push notifications**

---

## Success Metrics

### Phase Completion
- [ ] All 8 phases complete
- [ ] 40-50 API endpoints operational
- [ ] Mobile app shipped (v1)

### Performance
- [ ] API latency p95 < 200ms
- [ ] Web performance unchanged (no regression)
- [ ] Mobile battery usage acceptable

### Quality
- [ ] Zero production errors from new API
- [ ] Envelope pattern used consistently
- [ ] Structured logging throughout

---

## Documentation Structure

Each phase has a **self-contained implementation guide**:

### What's in Each Phase File?

1. **Context**: Why this phase exists, how it fits in grand vision
2. **Research**: Industry patterns, decisions made, trade-offs
3. **Current State**: How blah.chat works today (with file paths)
4. **Target State**: What we're building
5. **Implementation Steps**: Detailed, actionable tasks
6. **Code Examples**: Patterns to follow
7. **Success Criteria**: How to know phase is complete

A developer can pick up any phase file and understand the full picture without reading others.

---

## Getting Started

1. **Read this README** (you're here!)
2. **Review [Phase 0](./phase-0-foundation.md)** - foundation layer
3. **Understand the approved plan** - see `/Users/bhekanik/.claude/plans/delegated-cooking-quasar.md`
4. **Start implementation** when ready

---

## Questions or Issues?

- Reference the original research in plan file
- Check CLAUDE.md for project conventions
- See ENVELOPE_PATTERN_IMPLEMENTATION.md for envelope details
- See LOGGING.md for Pino patterns

---

## Timeline

```
Weeks 1-3:   Phase 0 - Foundation
Weeks 4-10:  Phase 1 - Mutations
Weeks 11-12: Phase 2 - React Query
Weeks 13-18: Phase 3 - Queries
Weeks 19-20: Phase 4 - Actions
Weeks 21-22: Phase 5 - Real-Time
Week 23:     Phase 6 - Resilient Generation
Weeks 21-22: Phase 7 - Performance (overlaps with Phase 5)
Weeks 23-24: Phase 8 - Documentation
```

**Mobile v1 ship target**: After Phase 3 (~18 weeks)
**Full parity**: After Phase 8 (~24 weeks)
