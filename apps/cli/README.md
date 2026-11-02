# blah.chat CLI

The active chat root uses scoped API-key HTTP RPC and SSE against `appUrl`.
`blah login`, `blah chat` and the SDK all use this same server. `useMessages`
loads a snapshot, consumes SSE updates and polls if the stream fails. There is no
direct Convex WebSocket provider in the terminal UI; backend Convex access stays
behind the authenticated web API. The legacy `convexUrl` config is not an active
chat transport selector.

```sh
agent-work run -- bun run build
agent-work run -- bun run typecheck
agent-work run -- bun run test:run
```

Build workspace dependencies first (`@blah-chat/api-client`, `@blah-chat/shared`
and `@blah-chat/chat-ui-core`). Synthetic transport tests do not prove a real
sign-in or live generation; those require an authorized integration environment.
