# Local Infra

Use `docker-compose.dev.yml` to run the rewrite stack locally:

- Postgres on `localhost:55432`
- Redis on `localhost:56379`
- Upstash-compatible Redis HTTP shim on `localhost:58079`
- MinIO on `localhost:59000`
- MinIO console on `localhost:59001`

Start:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Stop:

```bash
docker compose -f docker-compose.dev.yml down
```

Use `.env.local.docker.example` as the basis for local env values.
