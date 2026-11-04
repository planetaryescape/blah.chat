# Maintain the restored web cache

Use `useUserCache()` inside cache consumers. For authenticated rendering,
`CacheProvider` requires Clerk and Convex to agree on the user. A missing Convex
user, including `null`, blocks rendering rather than opening that user's previous
cache. Signed-out rendering uses a fresh, isolated empty cache, not an
authenticated user's persistent cache. Unresolved authentication blocks rendering.

## Identity and deployment changes

`BlahChatCache(userId)` partitions all ten tables by the configured Convex URL's
origin (protocol, hostname, and port) and Clerk user ID. Changing from the old
hostname-only name starts a cold cache. Old databases remain intact but are not
opened or replayed.

Keep asynchronous work bound to the database handle it started with.
`getActiveCache()` returns `null` during identity transitions; unlike `getCache()`,
it does not throw. Offline processing returns `cancelled` after an identity
change and `incomplete` after send failures. Show a success toast only for
`complete`. Pass the original mutation's cache handle to `enqueue` so a late
offline failure cannot queue the previous user's message for the next user.

Ordinary signed-in web chat sends are written to `pendingMutations` before their
first REST request as `sendMessageV2`. The payload retains its `clientMessageId`,
content, model/comparison choice, thinking effort and attachment references.
Keep this discriminator distinct: older readers that select only `sendMessage`
must ignore it. A confirmed 202 removes the matching row; an uncertain transport
outcome keeps it for reconnect/reload replay with the same key. Repeated unknown
outcomes move to attention instead of deleting the request; the existing queue
indicator offers an explicit retry when online. Incognito sends bypass this durable
outbox. Legacy `sendMessage` rows keep their existing compatibility path and do not
gain replay guarantees retroactively.

## Message reconciliation

Only pass the complete authorized message tree to `syncMessageTree`. An active
page omits inactive siblings and unloaded history and cannot identify orphans.
The sync compares complete cached rows, writes only changed rows, and deletes
orphan messages and their attachments, tool calls, and sources in one transaction.
Do not rely on `updatedAt` alone: partial content and branch flags can change
without a timestamp change.

Metadata writes check message existence inside the same four-table transaction
used by tree deletion, so a late metadata response cannot resurrect deleted rows.
The metadata hook observes message presence and retries if the tree arrives after
metadata; legitimate new-message metadata is not discarded permanently.

Pass the original query's requested message IDs as the fourth argument to
`syncMessageMetadata` for authoritative reconciliation. For each fetched table,
cached rows absent from the response are deleted only within that request scope,
before current rows are written. An empty array clears that table for the requested
messages; an omitted table, unresolved response, or omitted request scope does not
authorize deletion. An explicit empty request scope performs no writes.

## Verify changes

From `apps/web`, run:

```sh
agent-work run -- bun run test:run src/hooks/__tests__/cacheIdentity.test.tsx src/hooks/__tests__/useCacheSync.tree.test.ts src/lib/offline/__tests__/messageQueue.test.ts src/lib/hooks/mutations/__tests__/useSendMessage.test.ts --maxWorkers=4
```

These unit tests use storage mocks. Check actual IndexedDB transaction rollback
separately in an isolated browser using synthetic databases, never a user's cache.
