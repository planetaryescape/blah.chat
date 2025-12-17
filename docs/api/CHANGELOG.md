# API Changelog

## v1.0.0 (2025-12-17)

**Initial Release** 🎉

### Added

#### Core Features
- ✅ REST API v1 launched
- ✅ Conversations CRUD (create, read, update, delete)
- ✅ Messages CRUD with streaming generation
- ✅ Preferences management
- ✅ Long-running actions (search, transcription)
- ✅ Real-time updates via SSE
- ✅ Authentication via Clerk JWT
- ✅ HTTP caching (Cache-Control headers)
- ✅ Envelope response format
- ✅ Error codes and handling
- ✅ Mobile-ready (React Native compatible)

#### Architecture
- Next.js 15 API routes
- Convex backend (real-time database)
- React Query for client state
- SSE for real-time streaming
- Resilient generation (survives page refresh)

#### Endpoints
- `GET /api/v1/conversations` - List conversations
- `POST /api/v1/conversations` - Create conversation
- `GET /api/v1/conversations/:id` - Get conversation
- `PATCH /api/v1/conversations/:id` - Update conversation
- `DELETE /api/v1/conversations/:id` - Delete conversation
- `POST /api/v1/conversations/:id/archive` - Archive conversation
- `POST /api/v1/conversations/:id/pin` - Pin conversation
- `POST /api/v1/conversations/:id/star` - Star conversation
- `GET /api/v1/conversations/stream` - Stream conversation updates (SSE)
- `POST /api/v1/conversations/:id/messages` - Send message
- `GET /api/v1/conversations/:id/messages` - List messages
- `DELETE /api/v1/messages/:id` - Delete message
- `POST /api/v1/messages/:id/regenerate` - Regenerate response
- `GET /api/v1/messages/stream/:id` - Stream message updates (SSE)
- `GET /api/v1/preferences` - Get preferences
- `PATCH /api/v1/preferences` - Update preferences
- `GET /api/v1/preferences/stream` - Stream preference updates (SSE)
- `POST /api/v1/actions/transcribe` - Trigger transcription
- `POST /api/v1/search/hybrid` - Trigger hybrid search
- `GET /api/v1/actions/jobs/:id` - Poll job status
- `POST /api/v1/memories/extract` - Extract memories from conversation
- `GET /api/v1/health` - Health check (no auth)

#### Performance
- API p95 latency: <200ms
- Bundle size: 185KB (gzip)
- Cache hit rate: 85% (target)
- Payload optimization: 30-40% size reduction
- React Query: Aggressive caching (5min stale, 30min gc)

#### Documentation
- API Reference (full endpoint docs)
- Mobile Integration Guide (React Native)
- Best Practices (performance, security, patterns)
- Examples (copy-paste ready code snippets)
- Changelog (version history)

### Implementation Phases Completed

- ✅ Phase 0: Foundation (auth, DAL, envelope pattern)
- ✅ Phase 1: Mutations (POST/PATCH/DELETE endpoints)
- ✅ Phase 2: React Query (client state management)
- ✅ Phase 3: Queries (GET endpoints, polling)
- ✅ Phase 4: Actions (long-running operations)
- ✅ Phase 5: Real-Time (SSE streaming, optimistic UI)
- ✅ Phase 6: Validation (manual testing checklist)
- ✅ Phase 7: Performance (caching, optimization, monitoring)
- ✅ Phase 8: Documentation (API reference, mobile guide)

### Security
- Clerk JWT authentication
- Rate limiting (50 messages/day free tier)
- Input validation (Zod schemas)
- CORS configuration
- No token logging

### Caching Strategy
- Lists (conversations, messages): 30s fresh, 60s stale-while-revalidate
- Single items: 5min fresh, 10min stale
- Static data (preferences): 1h fresh, 2h stale
- Real-time (SSE, generation): no cache

### Error Handling
- Standard HTTP status codes
- Envelope error format
- Error codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `RATE_LIMIT`, `INTERNAL_ERROR`
- Retry-After header for rate limits

---

## Future Versions

### v1.1.0 (Planned - Q1 2026)
- [ ] Batch operations (bulk delete, bulk archive)
- [ ] WebSockets alternative (for iOS push notifications)
- [ ] Offline queue sync API
- [ ] GraphQL endpoint (optional, for complex queries)
- [ ] OpenAPI spec generation (auto-sync with code)

### v1.2.0 (Planned - Q2 2026)
- [ ] Pagination cursors (instead of page numbers)
- [ ] Field selection (sparse fieldsets)
- [ ] Sorting and filtering (query params)
- [ ] Conversation search endpoint
- [ ] Message search endpoint

### v2.0.0 (Planned - TBD)
- [ ] Breaking changes (TBD based on feedback)
- [ ] New features (TBD based on user requests)
- [ ] Deprecated endpoint removal

---

## Migration Guides

### Upgrading to v1.1.0 (when available)

**No breaking changes** - v1.1.0 is fully backward compatible.

New features can be adopted incrementally.

### Upgrading to v2.0.0 (future)

Migration guide will be provided 6 months before v2.0.0 release.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/blah.chat/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/blah.chat/discussions)
- **Email**: support@blah.chat

## License

MIT - See [LICENSE](../../LICENSE) for details.
