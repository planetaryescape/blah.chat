# 17: CLI

Keep the existing `blah` client working while exposing durable runs as small, scriptable commands. This is a compatibility proposal, D-031, not a new terminal UI project. The baseline already has an OpenTUI/Solid interactive `chat` command. Preserve it; add no replacement TUI. Q22/S15 gate supported client versions and delivery. New run/review/output behavior depends on [02](02-data-model.md), [04](04-durable-generation.md) and [10](10-artifacts-and-interactions.md), not terminal-owned generation.

In Quiet workbench, Q2, the answer or output is primary. A terminal shows one truthful current state and the next available action; detailed tool events appear only when requested. A successful HTTP request is not a successful task.

## Existing command contract

Source baseline `04866f80a6236716ebf8d8c5a79001727f85f4bf`: [`apps/cli/src/index.tsx`](../../apps/cli/src/index.tsx), [commands](../../apps/cli/src/commands), [transport test](../../apps/cli/tests/transport.test.ts). The following commands exist; the descriptions are not proposed additions.

```text
blah                                  local credential status and command hints
├── login [-k, --api-key <key>]         browser login by default
├── logout                            clear local credentials/client cache
├── whoami                            display locally stored identity/prefix
├── chat                              existing interactive conversation client
├── config [show]                     show is the default subcommand
│   ├── set <key> <value>
│   ├── reset
│   └── path
└── debug                             configuration/connectivity diagnostics
```

Root flags are Commander `-V, --version` and `-h, --help`; subcommands have help. The only registered action option is login's `-k, --api-key`. There is no existing global `--output`, `--json`, `--wait`, `--yes`, model flag or noninteractive send command. Do not document them as shipped.

Existing output is human text with terminal symbols, and `chat` renders interactive components. `config path` prints the config path. There is no current `table|json|jsonl|ids` output selector or stable machine-output schema. `whoami` reads local credentials; it does not validate them remotely. API-key login checks the `blah_` prefix and stores credentials, then suggests `whoami`; that suggestion is not proof of server validation. `chat` and `debug` call validation. `logout` clears local storage; it does not revoke the remote API key. ([Login](../../apps/cli/src/commands/login.tsx), [whoami](../../apps/cli/src/commands/whoami.tsx), [logout](../../apps/cli/src/commands/logout.tsx))

### Configuration, auth and transport

- `appUrl`, `convexUrl` and `environment` are the existing config keys. `environment` accepts `production|staging|development`. `convexUrl` validates HTTP(S) and `.convex.cloud`. `BLAH_APP_URL` overrides stored `appUrl`; other keys use stored/default values. Environment auto-detection does not select a different backend URL. Use `blah config path` rather than assuming an OS-specific Conf directory. ([Config implementation](../../apps/cli/src/lib/config.ts), [validation](../../apps/cli/src/commands/config.tsx))
- Auth and config use separate Conf stores with legacy credential migration; drafts have their own store. Credentials are not documented as OS-keychain encrypted. Preserve the split and never print the full API key in machine output, diagnostics or traces. Browser login opens configured `/cli-login`, receives fragment-backed credentials through the local port 9876 `/oauth/callback` flow and times out after five minutes. This is the current flow, not a security certification. ([Auth](../../apps/cli/src/lib/auth.ts))
- Active reads, sends and stream use `@blah-chat/api-client` over the same configured app URL, `/api/v1` HTTP/SSE and scoped API key. Do not infer direct Convex/BYOD transport from the stored `convexUrl`. `getClient` keys its cache by app URL plus credential. Request-wide hosted/BYOD routing remains S17, not a verified privacy promise. ([Client](../../apps/cli/src/lib/client.ts), [data audit](../../research_notes/blah-chat-modernization-review/data-security.md#ds-12--medium-rest-conversation-listing-passes-an-unsupported-convex-argument))
- `validateApiKey` clears credentials on SDK HTTP 401 and rethrows non-auth failures. Keep network/offline failures distinct from revoked credentials. The current string-based `isAuthError` heuristic also matches generic words such as invalid; new typed errors must not broaden credential clearing. Missing API key is `MISSING_API_KEY`; malformed SDK envelopes are `MALFORMED_RESPONSE`. Preserve existing status/code contracts while strengthening classification. ([Client](../../apps/cli/src/lib/client.ts#L61-L118), [SDK](../../packages/api-client/src/client.ts#L60-L123))
- `useMessages` initially lists messages, consumes SSE snapshot/update events and starts 1,200 ms fallback polling when stream iteration throws. It aborts the reader and clears polling on unmount. This is observation, not execution ownership. Offline drafts are not acknowledged sends, and exiting the client must not stop backend work. ([Hook](../../apps/cli/src/hooks/useMessages.ts), [ChatView](../../apps/cli/src/components/ChatView.tsx))

### Existing exit behavior, verified in source only

No CLI subprocess/runtime check ran in this planning task. These are explicit code paths, not a measured complete exit-code specification.

| Path | Existing source behavior |
|---|---|
| `login` callback failure/timeout; malformed API-key prefix | Explicit `process.exit(1)` |
| `config set` unknown key/environment/invalid Convex URL | Explicit `process.exit(1)` |
| Root or `whoami` without credentials | Prints not-logged-in message and returns, normally exit 0 |
| `chat` missing/revoked credentials or validation connectivity failure | Prints reason/hint and returns, normally exit 0; does not start UI |
| `debug` missing credentials, validation failure or caught network error | Prints diagnostics and returns, normally exit 0 |
| Successful text command | Returns without explicit failure, normally exit 0 |
| Parse errors, signals or uncaught errors | Commander/runtime behavior; exact subprocess contract needs S15 |

A zero from existing `chat`/`debug` therefore cannot be a health gate. Keep existing human commands compatible until a versioned behavior change is approved; do not advertise the proposed table below as current behavior.

## Proposed noninteractive additions

Every command and flag in this section is NEW and unimplemented. Use the existing HTTP/SDK boundary with coordinated OpenAPI, envelope, auth-scope and backend changes, D-002/D-031. Do not add an agent-only backend bypass or direct provider credentials.

```text
blah conversation list
blah conversation show <conversation-id>
blah message send <conversation-id> --text <text> --request-id <client-request-id>
blah run show <run-id>
blah run watch <run-id> [--timeout <seconds>]
blah run stop <run-id>
blah interaction show <interaction-id>
blah interaction answer <interaction-id> --version <version> --answer-file <path>
blah interaction review <interaction-id>       print an authenticated review URL
blah artifact list <conversation-id>
blah artifact show <artifact-id> --revision <revision-id>
blah artifact export <artifact-id> --revision <revision-id> --to <path>
```

`conversation list` and `conversation show <conversation-id>` are separate forms; list has no required ID. Proposed global flags for these new commands are `--output table|json|jsonl|ids` and `--no-color`. Keep default human output `table`; do not silently change `chat`, login or config output. New reads can use JSON; only event watches use JSONL; `ids` emits only the IDs the command returns and rejects commands with no meaningful ID result. Invalid command/format combinations fail before mutation. No `--yes` or implicit approval flag is proposed.

`message send` returns admitted `runId`, message references and `clientRequestId`, not a completed answer. Resolve stable `clientRequestId` plus `requestHash` in common server admission; repeat/lost-ack delivery returns the same result, a changed payload with the same key conflicts. Do not wrap a mutating request in generic retry without this contract. Explicit-model options can be added only through the central catalog/eligibility contract, not a terminal-local model list. (D-017/D-035)

### Output and envelope proposal

Use existing `formatEntity`, `formatEntityList`, `formatErrorEntity` and SDK parsing, not a CLI-specific JSON wrapper. The existing HTTP shape has `status: success|error`, `sys`, and `data` or `error`; preserve sys metadata and omission behavior. Example proposed single-run projection:

```json
{
  "status": "success",
  "sys": { "entity": "run", "id": "<run-id>" },
  "data": {
    "runId": "<run-id>",
    "conversationId": "<conversation-id>",
    "messageId": "<message-id>",
    "status": "waiting_for_input"
  }
}
```

This is a DTO proposal, not the current endpoint response or a second run store. Lists follow the existing list formatter's item envelopes. Existing messages-list/SDK parsing intentionally differs from ordinary list envelopes; coordinate endpoint/OpenAPI/SDK/tests if changing it. Never double-wrap blindly. ([Formatter](../../apps/web/src/lib/utils/formatEntity.ts), [existing contract caveat](../../research_notes/blah-chat-modernization-review/data-security.md#keep-useful-costapioperational-foundations))

JSON stdout contains one envelope only; JSONL watch emits one bounded authorized event envelope per line, using durable `runEvents.sequence` cursor ordering and deduplicating reconnect replay. Human hints/progress belong on stderr, with no ANSI in machine output. `ids` contains one ID per line and no prose. Errors preserve safe SDK code/status and never dump keys, prompt contents or private payloads. `artifact export` writes exact revision bytes/hash/MIME; it must not evaluate HTML/scripts. Avoid overwrite without explicit local confirmation/options and report server acknowledgement separately from local write success. (Q4/Q23)

### Run, wait, stop and review semantics

Use exactly `pending|running|waiting_for_input|waiting_for_approval|succeeded|failed|cancelled`. Preparing/compacting/retrying are event phases, not added states. Legacy message status remains `pending|generating|complete|stopped|error`; new read projections carry waits separately. Old clients must not stale-recover a durable wait as abandoned generating. A compatibility barrier, Q22, precedes enabling waits for readers that cannot represent them.

- `run show` is an inspection. Exit 0 means the read succeeded; the envelope may describe a failed or waiting run. Print the state prominently.
- `run watch` stops at terminal state or a durable human wait. A human wait prints the exact question/review reference and returns the proposed needs-input exit, never success. No terminal spinner or repeated provider call while waiting. Timeout stops observation, not the run.
- `run stop` sends common authorized cancellation, setting `cancelRequestedAt` and fencing future work. Request acknowledgement is not proof a dispatched effect was undone. Show the resulting persisted state and uncertain outcomes, then use watch if confirmation is needed. Closing an SSE reader, Ctrl-C or closing interactive chat is not Stop task. ([04](04-durable-generation.md))
- `interaction answer` supports clarification only, using authenticated ownership, exact `version`/`requestHash`, branch/run binding and compare-and-swap. Validate answer file against the authored request; duplicate submission returns the same receipt. Stale/expired/superseded/cancelled/foreign interaction must not resume anything.
- `interaction review` prints a trusted authenticated web route for an exact interaction; opening it does not approve it. Initially approvals remain in the complete web review experience. An agent cannot claim a user approved because it can invoke this command or type yes. A future terminal approval command needs its own reviewed exact-effect rendering/auth design, not automatic parity by name. (D-025; Q5)
- Artifacts use `artifacts`/`artifactRevisions` with explicit revision references. Human output shows ready/partial/failed truthfully; source/export is available without an iframe. Never select by matching title or the first current document.

### Proposed exits for new commands only

These numeric codes are a proposal awaiting implementation and S15 subprocess tests. They are not verified current CLI exits.

| Code | Meaning |
|---|---|
| 0 | Requested inspection/admission/stop-request/export succeeded; `run watch` uses 0 only for observed `succeeded` |
| 1 | Remote task failed or ordinary command operation failed |
| 2 | Invalid syntax/input/output-format combination |
| 3 | Authentication/authorization failure; do not erase credentials for non-auth network errors |
| 4 | Watch reached `waiting_for_input` or `waiting_for_approval`; explicit human action required |
| 5 | Watch observed `cancelled` |
| 6 | Observation timeout/connectivity failure; remote outcome not inferred |

Keep signal handling documented and testable; do not map Ctrl-C to task success or automatically cancel the backend. Retry reads/reconnects within bounds; retry effects only with admission/idempotency guarantees. Do not change existing offline/error strings/codes incidentally while adding these commands.

## Support for coding agents

Ship a proposed CLI agent skill alongside the command reference when machine commands exist. It must teach discovery/help, obtaining IDs, `json` versus `jsonl`, explicit request keys, inspection versus completion, human-wait exits, exact-revision exports, auth/offline recovery and safe Stop. Include subprocess examples with fake server fixtures. The skill must say that login, review URLs and clarification answers grant no third-party write authority. It must never read local auth files, print full credentials or inject host secrets into a skill/computer.

This is documentation for an agent using `blah`, separate from product Agent Skills in [08](08-skills.md). No coding skill is imported automatically into a user's library.

## Acceptance and delivery

S15 must execute built CLI subprocess tests for actual help/flags/output/exits, malformed envelopes, offline versus 401, reconnect/poll cleanup, duplicate/lost-ack send, durable waits, two-tab answers, stop/late settlement and exact-revision export. Preserve the existing same-app-URL/key HTTP/SSE transport test. Include old message/tool records and new projections against the correct candidate backend; test direct invocation of all public aliases, not only UI wrappers. Shared conversation deletion must reconcile identical children across web/REST/CLI rather than preserve the current incomplete CLI cascade. (D-022/D-031; S2/S17)

Run compatible built binary/package and auth callback checks through its existing [release channel](../../.github/workflows/release-cli.yml) when authorized. Record artifact/source SHA and supported backend range. Quiet workbench acceptance checks the first output, human wait and failure recovery in a real terminal: no false completion, no jargon-heavy event dump, no hidden blocking question. None of these runtime checks has run in this planning task.
