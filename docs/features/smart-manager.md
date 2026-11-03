# Project workspace reference

Use this reference to locate project screens and shared task/file capabilities.
They do not depend on the retired meeting/transcript workspace.

## Project routes

| Screen | Route |
| --- | --- |
| Project list | `/projects` |
| Overview | `/projects/<projectId>` |
| Tasks | `/projects/<projectId>/tasks` |
| Notes | `/projects/<projectId>/notes` |
| Knowledge | `/projects/<projectId>/knowledge` |
| Conversations | `/projects/<projectId>/conversations` |

The Tasks destination follows the existing `showTasks` preference; hiding it
does not delete tasks.

Project routes live in `apps/web/src/app/(main)/projects/[id]/`; navigation and
task visibility are implemented by `apps/web/src/components/projects/ProjectLayout.tsx`.

## Shared task deadlines

The task-manager tool retains natural-language deadline parsing. Its dedicated
`DEADLINE_PARSING_PROMPT` lives in `@blah-chat/ai/prompts/deadlineParsing`; it no
longer comes from a transcript-extraction prompt module. The configured
`DEADLINE_PARSING_MODEL` remains separate from ordinary chat model selection.

```ts
import { DEADLINE_PARSING_PROMPT } from "@blah-chat/ai/prompts/deadlineParsing";
```

For implementation and tests, follow
`packages/backend/convex/tools/taskManager.ts` and the prompt parity tests in
`apps/web/src/lib/prompts/__tests__/parity.test.ts`. Removing transcript extraction
does not remove task CRUD, tags, project relationships or voice input.

## File retrieval reference

The existing project file-management route remains
`/projects/<projectId>/files`. It is separate from the project's Knowledge page.
File extraction, chunking, embeddings and authorized retrieval remain shared
backend capabilities.

- `packages/backend/convex/files/chunking.ts` targets 500 estimated tokens per
  chunk with 75 estimated tokens of overlap, using character-based boundaries.
- File-processing status and chunk counts are shown by the project files page.
  Inspect failures there instead of treating an uploaded file as already indexed.
- Project/resource relationships use junction tables such as `projectFiles`,
  `projectNotes` and `projectConversations`; task tags use `taskTags`.

| Capability | Source |
| --- | --- |
| Tasks CRUD | `packages/backend/convex/tasks.ts` |
| Task tools and deadlines | `packages/backend/convex/tools/taskManager.ts` |
| Task tags | `packages/backend/convex/tasks/tags.ts` |
| Project resources and activity | `packages/backend/convex/projects.ts` |
| File extraction | `packages/backend/convex/files/extraction.ts` |
| File chunking | `packages/backend/convex/files/chunking.ts` |
| File embeddings | `packages/backend/convex/files/embeddings.ts` |
| File search | `packages/backend/convex/files/search.ts` |
| Project context in chat | `packages/backend/convex/generation.ts` |

## Retirement boundary

The Smart Assistant route, navigation, settings, review panels and extraction
actions are removed. An old bookmark or cached extraction caller cannot start
that workflow. Ordinary chat, model recommendations, tasks, notes, projects and
shared transcription remain separate capabilities.

This source removal does not migrate or delete historical tasks, notes, audio,
preferences or usage records. Historical source/accounting markers remain
readable until a separately authorized migration and supported-client barrier.
See [the retirement plan](../blueprint/16-smart-assistant-removal.md) for that
remaining boundary; source removal is not a claim that retained-data contraction
has completed.
