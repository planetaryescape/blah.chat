# Docker Compose

Use the root `docker-compose.yml` to run the web app plus local infrastructure:

```bash
cp docker/env.example .env.docker
# Edit .env.docker with real Clerk, AI Gateway, and Trigger.dev values.
BLAH_CHAT_ENV_FILE=.env.docker docker compose up
```

Open <http://localhost:3000>.

The default mode runs `next dev` inside Docker. For a production-like local run:

```bash
BLAH_CHAT_ENV_FILE=.env.docker BLAH_CHAT_MODE=production docker compose up -d
```

Background jobs still use Trigger.dev. If the Trigger CLI auth/env is configured, run the job worker too:

```bash
BLAH_CHAT_ENV_FILE=.env.docker docker compose --profile jobs up
```

The compose stack includes:

- Postgres on `localhost:55432`
- Redis on `localhost:56379`
- Upstash-compatible Redis HTTP shim on `localhost:58079`
- MinIO on `localhost:59000`
- MinIO console on `localhost:59001`

## Infra Only

Use `docker-compose.dev.yml` when you want to run Bun on the host and only start dependencies:

Start:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Stop:

```bash
docker compose -f docker-compose.dev.yml down
```

Use `docker/env.example` as the basis for local env values.
