# File RAG security boundaries

File chunking, storage extraction, and semantic search are internal Convex actions. Public clients cannot invoke them with an arbitrary file ID, storage ID, or supplied user ID. The ingestion worker calls the internal chunking and extraction actions after resolving a file record.

File search is used by trusted internal tools, which pass the user ID from their generation context. A project-scoped search checks that the project belongs to that user and restricts candidates to that user's project-file links before generating the query embedding. It rechecks the project and file links after search awaits before returning results. Search validates query length (1–2000 characters) and `topK` (integer 1–128), then checks both chunk and hydrated file ownership before returning content.

This boundary relies on Convex's public/internal function visibility and on internal callers preserving the trusted user context. It does not provide a project-collaborator ACL: project records have an owner, and this search path admits that owner only. The tests check the registered internal-action metadata and exercise the actual internal actions; `convex-test` permits direct dispatch to internal functions, so it does not simulate public network visibility.

Run the focused tests from the repository root:

```sh
agent-work run -- bun --filter=@blah-chat/backend run test:run convex/__tests__/fileAuthorization.test.ts --maxWorkers=4
```
