# cognitive-memory-eval

Synthetic harness for evaluating cognitive memory (decay + importance + associations) vs baseline vector search.

## Env

- `AI_GATEWAY_API_KEY` (Vercel AI Gateway)

## Run (cheap)

```bash
bun --filter=cognitive-memory-eval run gen --sample 1
bun --filter=cognitive-memory-eval run seed --sample 1
bun --filter=cognitive-memory-eval run answer --sample 1 --concurrency 3
bun --filter=cognitive-memory-eval run judge --sample 1 --concurrency 3
bun --filter=cognitive-memory-eval run analyze --sample 1
```

Artifacts (not committed):
- `test-data/*`
- `test-results/*`

## Flags

- `--sample N` first N personas
- `--force` overwrite outputs
- `--dry-run` never call LLM/embeddings; require outputs already exist
- `--concurrency N` for answer/judge

