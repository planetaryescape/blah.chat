# Archive: Original Research Reports

This directory contains the original research reports and analysis that were consolidated into the actionable issue files in `../issues/`.

## Why Archived?

The original reports were created by multiple AI agents analyzing OpenWebUI and comparing it to blah.chat. While comprehensive, they had significant overlap and were not directly actionable. They have been consolidated into 36 self-contained issue files.

**For active development, see: [`../issues/`](../issues/) and [`../README.md`](../README.md)**

## Contents

### Primary Research Documents

| File | Description | Lines |
|------|-------------|-------|
| `research-report.md` | Initial OpenWebUI analysis | 1,077 |
| `deep-research-report.md` | Detailed implementation research | 1,940 |
| `IMPLEMENTATION-SPECIFICATION.md` | Technical specifications | 1,857 |

### Agent Reports (`reports/`)

| Directory | Source | Files | Focus |
|-----------|--------|-------|-------|
| `antigravity/` | Antigravity agent | 7 | Executive analysis |
| `antigravity-gemini/` | Antigravity + Gemini | 5 | Executive analysis |
| `claude/` | Claude agent | 19 | Priority-indexed issues |
| `codex/` | Codex agent | 10 | Compact work items |
| `gemini-cli/` | Gemini CLI | 17 | Mixed fixes/features |
| `kimi/` | Kimi agent | 26 | Most structured |

### Notable Report Series

**Kimi (Most Structured)**
- `01-critical/` - Token counting, race conditions, unicode
- `02-scroll/` - Threshold optimization, smooth scrolling
- `03-generation/` - Concurrent locks, tool call fixes
- `04-microinteractions/` - Typing indicator, hover delays
- `05-architecture/` - Tree-based schema design
- `06-performance/` - Virtualization, object pooling
- `07-accessibility/` - Semantic HTML, keyboard nav

**Claude (Priority-Indexed)**
- 01-18 numbered issues covering drafts, scroll, IME, streaming, haptics, RTL, etc.

## Consolidated Output

All reports were merged into 36 issue files:

```
../issues/
├── P0-critical/     (4 files) - $438K impact
├── P1-scroll/       (5 files) - Scroll behavior
├── P2-input/        (3 files) - Input handling
├── P3-generation/   (2 files) - AI generation
├── P4-streaming/    (2 files) - Response streaming
├── P5-microinteractions/ (3 files) - Polish
├── P6-accessibility/ (4 files) - WCAG 2.2 AA
├── P7-architecture/ (3 files) - Tree branching
├── P8-performance/  (4 files) - 60fps target
└── P9-features/     (6 files) - New features
```

## Consolidation Rules Used

When the same issue appeared in multiple reports:

1. **IMPLEMENTATION-SPECIFICATION.md** - Most technically rigorous (priority 1)
2. **kimi/** - Best structured with code (priority 2)
3. **claude/** - Good detail (priority 3)
4. **deep-research-report.md** - Context/rationale (priority 4)
5. **Others** - Fill gaps only

## Statistics

| Metric | Value |
|--------|-------|
| Total source files | 85+ |
| Total lines analyzed | 10,000+ |
| Consolidated into | 36 files |
| Estimated work hours | 140h |
| Total cost impact | $438K+ annually |

## Do Not Edit

These files are preserved for reference only. All active development should use the consolidated issue files in `../issues/`.

If you need to reference original research, use the source files here. If you find information missing from the issue files, please update the issue file rather than working from these archives.

---

*Archived: 2026-01-16*
*Consolidation completed by Claude Code*
