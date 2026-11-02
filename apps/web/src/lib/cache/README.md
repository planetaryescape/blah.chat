# Maintain the restored web cache

Use `useUserCache()` inside cache consumers. `CacheProvider` mounts those
consumers only after Clerk and Convex agree on the authenticated user. A missing
Convex user, including `null`, blocks rendering rather than opening that user's
previous cache.

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

## Message reconciliation

Only pass the complete authorized message tree to `syncMessageTree`. An active
page omits inactive siblings and unloaded history and cannot identify orphans.
The sync compares complete cached rows, writes only changed rows, and deletes
orphan messages and their attachments, tool calls, and sources in one transaction.
Do not rely on `updatedAt` alone: partial content and branch flags can change
without a timestamp change.

## Verify changes

From `apps/web`, run:

```sh
agent-work run -- bun run test:run src/hooks/__tests__/cacheIdentity.test.tsx src/hooks/__tests__/useCacheSync.tree.test.ts src/lib/offline/__tests__/messageQueue.test.ts src/lib/hooks/mutations/__tests__/useSendMessage.test.ts --maxWorkers=4
```

These unit tests use storage mocks. Check actual IndexedDB transaction rollback
separately in an isolated browser using synthetic databases, never a user's cache.
