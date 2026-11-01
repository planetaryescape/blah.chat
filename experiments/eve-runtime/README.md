# Run the Eve runtime trial

Use this throwaway trial to decide whether Eve can replace agent execution
infrastructure in blah.chat. It does not change production chat or deploy anything.

## Run locally

From the repository root, install the existing workspace dependencies first:

```sh
bun install --frozen-lockfile
cd experiments/eve-runtime
bun install --frozen-lockfile --minimum-release-age 0
EVE_TELEMETRY_DISABLED=1 agent-work run -- bun run build
agent-work run -- bun run check
bun run trial
```

The release-age override applies only to this isolated, pinned prerelease trial.
Eve requires Node 24 or newer. Bun installs dependencies and runs the trial; Node
serves the built Eve app. `workspaces: []` keeps AI SDK 7 out of the app's AI SDK 6
dependency tree. No API keys, database, Docker, or cloud account are needed.

The runner binds `127.0.0.1:4318`, creates a random bearer token, and stops only its
own server process group. It deliberately kills that process during recovery
checks. Choose another port with `EVE_SPIKE_PORT=4320 bun run trial`.

**The recorded baseline is 7 passes and 2 failures.** Both crash-recovery checks
time out after 65 seconds. The command takes about two minutes and exits `1` when
any check fails. Do not turn these failures into expected passes to make it green.
See the [decision note](../../docs/research/eve-agent-runtime.md).

## Read the evidence

Each run writes `results/<run-id>/summary.json`, session event snapshots, and
`server.log`. Instrumentation appends usage to `results/usage.jsonl`; the report
selects only the current run's session IDs. Eve retains workflow state under
`.eve/.workflow-data` and sandbox state under `.eve`.

The committed [baseline](evidence/local-runtime.json) contains measured results.
Full generated logs and runtime state stay ignored. Timings describe this machine
and this fixture, not production latency or model performance.

The scripted model determines which tool to request. Eve performs the actual
workflow, tool execution, approvals, streaming, cancellation, and checkpointing.
The model uses the V3 protocol used by AI SDK 6, but comes from AI SDK 7's test
helpers. This does not prove every existing provider or tool factory is compatible.

`quote_cost` wraps existing `packages/ai/src/utils.ts` business logic. It does not
reuse Composio's authenticated tool factory. `record_decision` writes only to the
trial sandbox. Its file check is not a concurrency-safe production idempotency
mechanism. The usage file is not a billing ledger; production must upsert by the
instrumentation idempotency key and handle interrupted calls.

## Try a live model

Supply `AI_GATEWAY_API_KEY` through your existing secret injection. Do not commit
it. Then run:

```sh
EVE_SPIKE_LIVE=1 bun run trial
```

Live mode runs authentication, the pricing-tool turn, and usage reporting only.
It makes paid model calls. `EVE_SPIKE_MODEL` accepts a key from
`packages/ai/src/models.ts`; leave it unset for the cheapest non-deprecated,
priced, tool-capable `openai:` entry. This path uses Vercel AI Gateway, not
OpenRouter credentials. The session output-token cap applies between model calls,
not as a strict dollar cap. Live mode has not been run in the recorded baseline.

## Trial boundaries

- Single-operator bearer authentication, not Clerk or multi-tenant session access.
- Local filesystem Workflow backend, not Vercel Workflow or Postgres.
- just-bash virtual filesystem, not VM isolation, native execution, or browser tools.
- No production Postgres writes, SSE adapter, UI, or Trigger.dev changes.
- No verified subagents, model switching, BYOK, memory integration, or upgrades.

Keep this on the spike branch until the decision is made. If Eve is adopted,
build the production integration separately rather than promoting these fixtures.
