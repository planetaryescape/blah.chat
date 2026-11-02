# Refresh the model catalog

Verify current provider IDs before adding a model, then deploy and synchronize the database-backed picker. Updating a display name does not change the API model or configure its credentials.

## Check public listings

```sh
bun run model:check
```

This reads OpenRouter's public catalog without credentials or inference calls. It checks the 19 models in `packages/ai/src/models-current.ts` for API ID, base price, context window, vision and tool support. Exit code 1 reports drift; it does not edit configuration. The November 2, 2026 refresh was checked against [OpenRouter](https://openrouter.ai/api/v1/models) and [Vercel AI Gateway](https://ai-gateway.vercel.sh/v1/models).

Edit the shared catalog, not individual clients. Keep superseded entries in `packages/ai/src/models.ts` with `isDeprecated: true` so existing conversations retain their original model IDs. Do not silently remap old conversations. The direct GPT-OSS default and the temporary direct-only Auto routing policy are unchanged.

For prompt-length price changes, add `pricing.tiers`; `minInputTokens` is inclusive and selects whole-request rates using total input, including cache hits. Prices are estimates: OpenRouter host prices, cache writes, media charges and time-based discounts can vary. MiniMax M3.1 Flash's listed base rate includes a time-dependent discount; do not treat the catalog estimate as a provider invoice.

## Configure the generation backend

In the Convex dashboard, select the intended production deployment, open **Settings > Environment Variables**, and set `OPENROUTER_API_KEY` from your secret manager. For this app, production is `accurate-chameleon-837`. Do not paste the key into chat, logs or source control.

The key must exist in **Convex**, where generation runs. A Vercel-only key does not authenticate Convex actions. A sensitive Vercel key cannot be read back; recover the original from your secret manager or obtain a replacement through your provider account. Do not purchase credits as part of a configuration fix without separate approval.

## Release and synchronize

Use the normal reviewed release process. First validate the target/schema without writing:

```sh
# From packages/backend, with the intended deployment already selected:
agent-work run -- bunx convex deploy --dry-run --yes
```

After deploying the reviewed backend, synchronize known model records:

```sh
bunx convex run models/seed:seedModels '{}'
```

Do not pass `clearExisting`. The seed updates known records, adds new models and preserves custom entries. It does not edit messages, conversations or existing router preferences. Deploy the web/shared package changes too so static clients and database transforms agree on pricing tiers.

## Verify generation

Use a dedicated non-admin QA identity. Select a new model, send a short message, refresh, and confirm the durable response and recorded usage. Confirm a missing/invalid key reports an authentication error rather than `No output generated`. Check provider 402 and 429 failures separately; ordinary throttling must not trigger a depleted-credit alert.

If live credentials are unavailable, report that limitation. Passing mocked provider tests or public catalog checks does not prove successful production inference.
