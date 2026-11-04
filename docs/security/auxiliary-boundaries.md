# Auxiliary AI action boundaries

Selection summaries require an authenticated Convex identity. The action charges the request to that identity's recorded monthly budget and records token usage through `usage.mutations.recordTextGeneration` when the provider reports it. The configured operational `SUMMARIZATION_MODEL` is used; this action does not resolve user BYOK credentials.

The summary action rejects blank selections, text longer than 16,000 characters, requests over the caller's existing monthly budget, and requests whose estimated input and capped 1,024-token output cost would exceed the remaining budget. The input estimate uses the repository's character-based token estimator. Each summary SDK call disables automatic retries, permits at most two active summaries per warm Convex worker, and aborts inference after 30 seconds. These checks bound one action, but do not reserve spend transactionally across concurrent workers. Recorded budget checks therefore are not a guaranteed global billing ceiling. If the SDK exposes usage on a failed request, that usage is recorded; provider failures that expose no usage cannot be metered here.

A configured monthly budget of zero means unlimited in the existing budget policy; recorded-spend and remaining-budget rejection do not apply in that case. Authentication, input, output, timeout, concurrency and usage-recording checks still apply.

The model recommendation preview requires a registered authenticated user and reads its conversation and messages through the existing authenticated `conversations.get` and `messages.list` queries. These queries allow the conversation owner and existing collaborators; anonymous, unregistered and nonmember callers, and missing conversations, fail before prompt construction, provider work or usage recording. When any returned message has `isActiveBranch: true`, preview context uses only those active-branch messages; if none do, all returned legacy messages remain eligible for the existing context window. Before constructing the prompt or calling a provider, the action checks the caller through `api.usage.checkBudget.checkBudget` and rejects a denied monthly budget. A budget of zero remains unlimited under that existing query. Successful preview usage is charged to the authenticated caller under `model_recommendations`. Classification and analysis calls use that same feature category. This is an application-layer boundary; it does not change the usage schema or historical rows.

The former `ai/taskExtraction:extractTasksFromTranscript` and `ai/meetingExtraction:extractFromMeeting` actions are no longer registered. Stale authenticated and anonymous clients cannot invoke an extraction implementation or provider through either reference. The meeting/transcript route, prompts and feature-only model configuration are removed; shared task, voice and deadline functionality remains in place. Historical data markers are retained, not migrated or deleted by this source removal.

Run the focused boundary tests from the repository root:

```sh
bun run --filter @blah-chat/backend test:run -- convex/__tests__/auxiliaryAuthorization.test.ts
```

Verify recommendation accounting and preview access with the action-level mocked-provider fixture:

```sh
bun run --filter @blah-chat/backend test:run -- convex/__tests__/modelTriageAccountingAuthorization.test.ts
```

The tests dispatch through Convex action references with `convex-test`, mock AI SDK calls, and inspect the actual usage records. They should show zero provider calls for anonymous, invalid and over-budget summaries. Stale extraction references should fail module lookup for both anonymous and authenticated clients, with zero provider calls; a still-registered fail-closed tombstone is not sufficient for that source-removal check.
