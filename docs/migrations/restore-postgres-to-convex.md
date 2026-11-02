# Restore a private Postgres snapshot into Convex

Use this admin-only importer to restore application records into the existing
Convex schema. It reads a saved JSON snapshot, not a database connection. It never
modifies Postgres, downloads legacy files, executes tools, regenerates embeddings,
replays generation requests, or charges usage.

## Plan without connecting to Convex

From the repository root, supply paths outside the repository for both the source
snapshot and the private report:

```sh
agent-work run -- bun run scripts/migrations/restore-postgres.ts \
  --snapshot /private/path/postgres-snapshot.json \
  --report /private/path/restore-plan.json \
  --namespace postgres-cutover-20261102
```

The snapshot shape is `{ "exportedAt": "...", "tables": { "users": [...] } }`.
SQL timestamps must already be numeric milliseconds. The planner validates values
against the target schema and reports counts by source table and action. Reports
are written with mode `0600`; they contain legacy identifiers and must remain
private. Neither reports nor console output contain message bodies or credentials.
Keep the original snapshot unchanged.

Inspect the report's `rows` for `blocked` actions and `warnings`. Warnings identify
unrepresented source fields by name, not value. Do not equate a successful dry run
with an executed import: schema enforcement on actual inserts is another gate.

## Verify locally

```sh
agent-work run -- bunx turbo run build '--filter=@blah-chat/backend^...' --concurrency=4
```

From `packages/backend`, run synthetic tests:

```sh
agent-work run -- bun run test:run \
  convex/migrations/restorePostgres.test.ts \
  convex/migrations/restorePostgresRunner.test.ts --maxWorkers=4
```

The dry-run validates every planned source value against the target contract.
Synthetic `convex-test` cases exercise actual insert/patch validation, fresh IDs,
references, atomic rejection, reruns, and derived junctions. Full-snapshot mock
replay exceeded a four-minute local budget; full-scale remote execution and the
final audit remain coordinator gates after deployment.

## Deploy, then explicitly apply

Have the cutover coordinator deploy the backend and the two new mapping tables
using the normal reviewed deployment process. This helper never deploys code.
Start with an empty application target. Keep the app quiescent until both passes
and the audit finish; pass 1 intentionally lacks optional tree references.

Pause scheduled recovery, extraction, and retention jobs before deploying the
importer. From `packages/backend`, target the new deployment explicitly:

```sh
bunx convex env set CUTOVER_PAUSE_CRONS true --deployment bhekani-khumalo:blah-chat:production
```

Deploy with the reviewed destination deploy key. The cron configuration exports
no jobs while this flag is `true`; changing the flag requires another deployment
before the scheduled-job configuration takes effect.

Inject these variables securely into the runner environment, never into arguments
or a committed file:

| Variable | Purpose |
| --- | --- |
| `RESTORE_CONVEX_URL` | Exact destination HTTPS `*.convex.cloud` URL |
| `RESTORE_CONVEX_ADMIN_KEY` | Destination deployment admin credential |
| `MIGRATION_SOURCE_ENCRYPTION_KEY` | Optional original BYOK encryption key |
| `BYOD_ENCRYPTION_KEY` | Optional key configured on the destination backend |

The encryption variables are only needed to attempt BYOK preservation. The runner
requires matching derived keys, the target's four colon-separated IV/tag slots,
hex ciphertext, 16-byte IVs, 16-byte tags, and successful AES-GCM authentication.
It never writes plaintext. Empty BYOK settings rows need no encryption key;
their flags survive, but empty ciphertext/IV/tag fields are omitted. The
coordinator must independently verify that the
destination backend really uses the supplied `BYOD_ENCRYPTION_KEY`. A missing or
incompatible key blocks that source row; it does not block other user data.

```sh
agent-work run -- bun run scripts/migrations/restore-postgres.ts \
  --snapshot /private/path/postgres-snapshot.json \
  --report /private/path/restore-result.json \
  --namespace postgres-cutover-20261102 \
  --apply --confirm-target accurate-chameleon-837.convex.cloud
```

The hostname confirmation must match `RESTORE_CONVEX_URL`. All remote functions are
`internalMutation`/`internalQuery`; ordinary authenticated clients cannot invoke
them. Arguments travel in HTTPS request bodies with admin authentication, not in
process arguments. Calls are sequential and bounded to 40 rows / 650,000 UTF-8
bytes. Failed atomic batches are retried individually; transport failures stop
the run rather than classifying unexecuted records as invalid.

## Audit and resume

Pass 1 creates fresh Convex IDs and records each source table/key mapping in
`postgresRestoreRows`. Required dependencies are inserted first. Pass 2 resolves
optional/cyclic references, ordered parent arrays, legacy parent lookup IDs,
roots, active leaves, embeddings, and user admin role/tier settings. Serialized
global settings are flattened into `adminSettings` without broadening its schema.
If their source updater is null, the sole source admin is used with an explicit
warning; a missing alert recipient defaults to that admin's email. Ambiguous
admin attribution blocks the settings row instead of guessing.
Project conversation/note
junctions and centralized note/task/bookmark tags are derived from legacy fields;
their additional mappings are named `derived_*` and counted in `derivedCounts`.
The source row counts remain separate from the expanded `expectedRows` count.
Each edge is verified
against its child's restored parent array. Historical tool outputs and usage are
inserted as records only. Interrupted generation is marked `stopped`, never resumed.

Rerun the **same command, snapshot, namespace, and helper revision** after an
interruption. Successful mappings prevent duplicate inserts; pass-2 patches reuse
those IDs. Transient validation/reference-blocked rows are retried. Completed rows
are not overwritten, so reruns do not erase later application edits.

The namespace locks both the snapshot hash and conversion-plan hash. Do not use a
new namespace to bypass a hash mismatch on a populated target: that would create
duplicates. A changed snapshot/conversion policy requires a separately reviewed
repair using the durable mappings, or a new empty destination. There is no delete,
reset, rollback, or arbitrary public-write helper.

The final private report includes paginated remote `audit` rows and
`accountingComplete`. Check all of the following before allowing app traffic:

- Audited row count equals `expectedRows`, with no `inserted` status remaining.
- Every core source row has `imported`, `converted`, or an individually reviewed
  `blocked` status. `retained` is reserved for operational/configuration history.
- Actual core counts match the report; test login, conversations, active branch,
  notes, tasks, bookmarks, historical citations, and costs in the app.
- Review all warnings and block reasons; partial retention is not full success.

Export the restored deployment before default repairs or smoke writes:

```sh
bunx convex export --path /private/path/convex-restored.zip \
  --deployment bhekani-khumalo:blah-chat:production
```

Compare actual documents with the snapshot and mapping report, rather than trusting
import counts alone. Check message content and roles, ownership, ordered parent
arrays, roots, and active leaves. Convex exports include `_tables` metadata whose
rows have `name` and `id`, not document `_id` fields; exclude it from document audits.
Also check message pagination against preserved `createdAt`: import-time
`_creationTime` order can differ from the original conversation order.

Expect a cold browser cache after cutover. IndexedDB is partitioned by deployment
and authenticated user; legacy shared caches are left intact but never opened or
replayed. Account changes remount cache consumers before reading private data.
The message tree cache retains inactive siblings for version controls separately
from the paginated active-message display.

Exit codes: `0` means dry-run success or complete import without blocked records;
`2` means the audit is incomplete or some rows remain blocked; `1` means the run
stopped. Detailed raw server errors are deliberately not printed. Use the private
report and deployment diagnostics, not payload logging, to investigate.

After auditing, clear the pause and redeploy the same reviewed code:

```sh
bunx convex env set CUTOVER_PAUSE_CRONS false --deployment bhekani-khumalo:blah-chat:production
agent-work run -- bun run deploy
```

Keep production traffic on the old artifact until the restored backend passes
live generation checks and the staged Vercel artifact reports Convex readiness.

Run the backend smoke with securely injected `CONVEX_DEPLOY_KEY`,
`NEXT_PUBLIC_CONVEX_URL`, and an existing test user's `SMOKE_CLERK_ID`:

```sh
agent-work run -- bun run packages/backend/scripts/smokeConvex.ts --run
```

This checks sending, reconnect durability, regeneration, comparison, and stopping
all comparison responses. It uses admin impersonation, so it does not prove Clerk
browser authentication. Verify the sign-in form on the production hostname as
well; a production Clerk instance can reject the staged `vercel.app` origin.

### Repair new-chat defaults during the provider outage

Only after checking the imported data, an operator can replace unavailable
new-chat model preferences with the verified direct-provider default:

```sh
bunx convex run migrations/cutoverDefaults:useAvailableTextDefault \
  '{"acknowledgeProviderOutage":true}' --deployment bhekani-khumalo:blah-chat:production
```

This internal mutation preserves direct Groq/Cerebras choices and all historical
conversation/message model labels. It returns counts grouped by the previous
default. It does not buy credits or make unavailable providers work. Do not run
it as routine maintenance after users have made new model choices.

Preserve the imported spending policy. An explicitly enabled monthly hard limit
blocks paid chat scheduling once the initiating user's recorded monthly cost
reaches the configured positive budget. Without persisted settings, enforcement
defaults off. This checks recorded usage; it does not reserve unknown costs for
already-running requests. Budget reads are restricted to the authenticated owner.

## Expected conversion limits

- External object-storage keys are not Convex `_storage` IDs. File-backed knowledge
  sources, TTS cache entries, and any nonempty unsupported file/document tables
  are blocked individually pending a separate transfer. Empty tables need no writes.
- Disposable provider-health samples stay in Postgres and the snapshot. Their
  aggregate source count is explicit in the report; they are not uploaded.
- Generation/session and router operational history, suggestion caches, and
  Postgres router configuration remain in Postgres and the private snapshot
  with individual `retained` mappings. Review destination settings separately.
- Incomplete cached model recommendations are omitted with a warning while the
  conversation survives. Usage `completion` is normalized to target `text`.
- Embeddings must have exactly 1536 finite coordinates; no truncation, padding,
  regeneration, provider substitution, or tool/usage replay occurs.
- Nonempty BYOK rows without verified compatible ciphertext/key material are blocked;
  empty settings rows are restored without provider credentials.
  CLI credential hashes and compatible Composio connection records are preserved;
  OAuth states and secrets must not be included in public reports.

Retain Postgres, the original private snapshot, and the mapping tables until the
coordinator explicitly approves a later retention/cleanup plan.
