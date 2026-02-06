# Raycast Extension CI Publish

`release-raycast.yml` publishes on `main` when `apps/raycast/**` or `packages/sdk/**` changes.

Required GitHub Actions secrets:

- `RAY_TOKEN`: Raycast publish token from your Raycast account settings after logging in to the extension publisher.
- `RAYCAST_OWNER`: Raycast owner slug (team/account that owns the extension). Must match the owner you publish under.

How to set:

1. Open GitHub repo settings -> Secrets and variables -> Actions.
2. Add `RAY_TOKEN` and `RAYCAST_OWNER` in the `production` environment.
3. Keep `apps/raycast/package.json` `owner` empty locally; CI injects it from `RAYCAST_OWNER`.
