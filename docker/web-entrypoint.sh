#!/bin/sh
set -eu

if [ "${BLAH_CHAT_INSTALL_DEPS:-1}" != "0" ]; then
  bun install --frozen-lockfile
fi

if [ "${BLAH_CHAT_RUN_MIGRATIONS:-1}" != "0" ]; then
  bun run db:migrate
fi

case "${BLAH_CHAT_MODE:-dev}" in
  dev|development)
    exec bun --filter=@blah-chat/web run dev --hostname 0.0.0.0
    ;;
  prod|production)
    bun run build --filter=@blah-chat/web...
    exec bun --filter=@blah-chat/web run start --hostname 0.0.0.0
    ;;
  *)
    printf 'Unknown BLAH_CHAT_MODE: %s\n' "$BLAH_CHAT_MODE" >&2
    exit 1
    ;;
esac
