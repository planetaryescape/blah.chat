# blah.chat Documentation

## Quick Links
- [spec.md](./spec.md) - Master specification (schema, features, requirements)
- [CLAUDE.md](../CLAUDE.md) - AI assistant instructions

---

## Architecture
Core system design and patterns.

- [API Hybrid Architecture](./architecture/api-hybrid.md) - REST + Convex dual transport
- [Resilient Generation](./architecture/resilient-generation.md) - Server-side streaming that survives refresh
- [Schema Normalization](./architecture/schema-normalization.md) - Database design patterns
- [TypeScript Workarounds](./architecture/typescript-workarounds.md) - Convex type depth solutions

---

## Features
Feature-specific documentation.

- [Canvas](./features/canvas.md) - Split-screen document editor
- [Slides](./features/slides.md) - AI-powered presentation generator
- [Reasoning](./features/reasoning.md) - Model thinking/reasoning display
- [Notes](./features/notes.md) - Markdown note-taking system
- [Shared Conversations](./features/shared-conversations.md) - Collaboration feature
- [Smart Manager](./features/smart-manager.md) - Task extraction from transcripts
- [BYOD](./features/byod.md) - Bring Your Own Database
- [Tiers](./features/tiers.md) - User tier and pro model access
- [Tool Calling](./features/tool-calling.md) - LLM tool execution
- [Memory System](./features/memory-system.md) - RAG memory
- [Math/LaTeX](./features/math-latex-rendering.md) - Equation rendering
- [Incognito Mode](./features/incognito-mode.md) - Privacy mode
- [TTS](./features/tts.md) - Text-to-speech

---

## API
REST API for mobile and external access.

- [Overview](./api/README.md) - Quick start
- [Reference](./api/reference.md) - Endpoint documentation
- [Best Practices](./api/best-practices.md) - Performance and security
- [Mobile Integration](./api/mobile-integration.md) - React Native guide
- [Examples](./api/examples.md) - Code samples

---

## Mobile
React Native app implementation.

- [Overview](./mobile/README.md) - Architecture and phases
- [Phase 0-4](./mobile/) - Implementation guides

---

## Models
Database-backed model management.

- [Overview](./models/README.md) - Migration from hardcoded to DB
- [Phase 1-6](./models/) - Implementation guides

---

## Design
UI/UX documentation.

- [Design System](./design/design-system.md) - Colors, typography, tokens
- [UI/UX Patterns](./design/ui-ux-patterns.md) - Interaction patterns

---

## Guides
How-to references.

- [System Prompts](./guides/system-prompts.md) - Prompt engineering
- [Logging](./guides/logging.md) - Pino logging setup
- [Key Features](./guides/key-features.md) - Feature overview

---

## Implementation
Development history and decisions.

- [Rollup](./implementation/rollup.md) - Phase decisions and rationale
- [Knowledge](./implementation/knowledge.md) - Lessons learned

---

## Research
Technical investigations.

- [Streaming Animation](./research/streaming-animation.md) - Text animation research
- [Web Worker Highlighting](./research/web-worker-highlighting.md) - Syntax highlighting

---

## Testing
Test documentation.

- [Resilient Generation Manual](./testing/resilient-generation-manual.md) - Core feature tests
