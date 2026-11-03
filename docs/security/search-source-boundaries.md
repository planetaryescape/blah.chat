# Search and source read boundaries

Use these Convex endpoints only with the caller's authenticated identity. A
caller-supplied user ID is a compatibility argument, not an access grant.

## Search

`api.search.fullTextSearch`, its nested alias
`api.search.hybrid.fullTextSearch`, and both hybrid-search action aliases derive
the user from Convex identity. Full-text search returns an empty result for an
anonymous caller or when the required `userId` argument does not match that
identity. Results are scoped to the identity's user ID. A conversation filter
also requires owner or participant access.

Both full-text and hybrid search trim the query and require 1 to 500 characters.
The result limit is bounded to 1 through 100; non-finite values use the default
of 20. Hybrid search checks identity and any conversation filter before it
reads search results or starts embedding work. An unauthorized or invalid query
returns an empty result.

## Sources

`api.sources.operations.getSources` and
`api.sources.operations.getSourcesWithFallback` authorize through the message's
parent conversation before reading source or metadata rows.
`api.sources.operations.getByConversation` checks the requested conversation
before reading sources, then confirms each source's message still belongs to
that conversation. Owners and active conversation participants can read these
results. Anonymous, foreign, revoked, missing-message, and deleted-parent
message requests return empty results using the endpoint's normal empty shape.
For a conversation request, an unauthorized or deleted conversation returns
an empty array. Orphaned source rows and rows whose message belongs to a
different conversation are omitted.

Public shares use their separate share projection. A public share does not
grant anonymous access to these private search or source queries.
Read-only shared messages skip the private source subscription; editable
private messages retain their source lookup. The read-only path still renders
the shared answer when private source data is unavailable.

The checks use the existing `getCurrentUser` and
`canAccessConversation` implementations. `canAccessConversation` treats the
conversation owner and a row in `conversationParticipants` for a collaborative
conversation as authorized; removing that participant row revokes access.

Run the backend boundary tests from the repository root:

```sh
agent-work run -- bun --filter=@blah-chat/backend run test:run convex/__tests__/searchSourceAuthorization.test.ts --maxWorkers=4
```
