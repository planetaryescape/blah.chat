# Auxiliary AI action boundaries

Selection summaries require an authenticated Convex identity. The action charges the request to that identity's recorded monthly budget and records token usage through `usage.mutations.recordTextGeneration` when the provider reports it. The configured operational `SUMMARIZATION_MODEL` is used; this action does not resolve user BYOK credentials.

The summary action rejects blank selections, text longer than 16,000 characters, requests over the caller's existing monthly budget, and requests whose estimated input and capped 1,024-token output cost would exceed the remaining budget. The input estimate uses the repository's character-based token estimator. Each summary SDK call disables automatic retries, permits at most two active summaries per warm Convex worker, and aborts inference after 30 seconds. These checks bound one action, but do not reserve spend transactionally across concurrent workers. Recorded budget checks therefore are not a guaranteed global billing ceiling. If the SDK exposes usage on a failed request, that usage is recorded; provider failures that expose no usage cannot be metered here.

A configured monthly budget of zero means unlimited in the existing budget policy; recorded-spend and remaining-budget rejection do not apply in that case. Authentication, input, output, timeout, concurrency and usage-recording checks still apply.

The public `ai.taskExtraction.extractTasksFromTranscript` and `ai.meetingExtraction.extractFromMeeting` references remain temporarily for compatibility, but throw a retired-feature error before model work. Production Convex responses may redact this plain error's message; the caller-visible wording is not guaranteed. They do not return empty results that could be mistaken for successful extraction. The full Smart Assistant source and caller purge is a later cleanup; shared task, voice, and deadline functionality remains in place.

Run the focused boundary tests from the repository root:

```sh
bun run --filter @blah-chat/backend test:run -- convex/__tests__/auxiliaryAuthorization.test.ts
```

The tests dispatch through the public Convex action references with `convex-test`, mock AI SDK calls, and inspect the actual usage records. They should show zero provider calls for anonymous, invalid, over-budget, and retired requests.
