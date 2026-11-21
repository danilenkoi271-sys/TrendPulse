#!/usr/bin/env bash
# Runs the SQL test suite.
#   TEST_DATABASE_URL  postgres URL of a SCRATCH database (it is dropped and rebuilt!)
#   WITH_SHIM=1        apply support/00_supabase_shim.sql (plain Postgres only; skip on local Supabase)
# On a local Supabase stack (`supabase start`) the DB already has auth/roles; run with WITH_SHIM=0
# against a scratch db created from the same migrations.
set -euo pipefail
cd "$(dirname "$0")"
URL="${TEST_DATABASE_URL:?set TEST_DATABASE_URL to a scratch database}"
PSQL=(psql "$URL" -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -c "drop schema if exists public cascade; create schema public; drop schema if exists auth cascade;" >/dev/null 2>&1
"${PSQL[@]}" -c "grant all on schema public to public;" >/dev/null
[ "${WITH_SHIM:-1}" = "1" ] && "${PSQL[@]}" -f support/00_supabase_shim.sql >/dev/null
for m in ../migrations/*_schema.sql ../migrations/*_functions.sql ../migrations/*_top10_limit.sql; do "${PSQL[@]}" -f "$m" >/dev/null; done
fail=0
for t in [0-9]*.sql; do
  echo "== $t"
  if ! out=$( { cat support/helpers.sql; cat "$t"; } | psql "$URL" -v ON_ERROR_STOP=1 -q 2>&1 ); then
    echo "$out" | grep -E "FAIL|ERROR" || echo "$out"; fail=1
  else
    echo "$out" | grep -c "ok - " | sed 's/^/   assertions passed: /'
  fi
done
exit $fail
