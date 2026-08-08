#!/bin/sh
set -eu

database_url="${DATABASE_URL:-}"

# Container Manager values are sometimes pasted with quotes or as a plain path.
case "$database_url" in
  \"*\") database_url="${database_url#\"}"; database_url="${database_url%\"}" ;;
  \'*\') database_url="${database_url#\'}"; database_url="${database_url%\'}" ;;
esac

case "$database_url" in
  "") database_url="file:/data/cryptolyst.db" ;;
  file:*) ;;
  /*) database_url="file:${database_url}" ;;
  *)
    echo "[entrypoint] DATABASE_URL must be file:/path/to/database.db (received an invalid value)" >&2
    exit 1
    ;;
esac

export DATABASE_URL="$database_url"
echo "[entrypoint] SQLite database: ${DATABASE_URL#file:}"

npm run db:init
exec node node_modules/next/dist/bin/next start
