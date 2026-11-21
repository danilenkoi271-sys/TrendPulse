# Trendline

A play-money game where you buy and sell shares in YouTube artists. A share's price follows how the
channel's views over the last 7 days compare with an expected pace.

> **Play money. No cash value. No deposits or withdrawals.** There is no payment, deposit, withdrawal or
> cash-conversion code in this project, by design.

**Verified vs. estimated.** Verified prices are computed from YouTube data every 15 minutes. Between
those, the server inserts simulated ticks every minute (within ±5% of the last verified price). Every
price in the UI is labelled *Verified* or *Estimated*.

## Layout
- `supabase/migrations/` schema + RLS, functions, schedules (pg_cron / pg_net)
- `supabase/functions/poll-views/` Edge Function (YouTube → `record_snapshot`)
- `supabase/seed.sql` three fictional sample artists (placeholder channel IDs, see TODOs)
- `supabase/tests/` SQL tests (`run.sh`)
- `src/` React + Vite + TypeScript app (landing page, markets, artist, portfolio)

## Setup
1. `supabase start`, then `supabase db reset` (applies migrations + seed).
2. `cp .env.example .env.local` and fill `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
3. `npm install && npm run dev`.
4. Edge Function secrets: `supabase secrets set YOUTUBE_API_KEY=...` (`SUPABASE_SERVICE_ROLE_KEY` and
   `SUPABASE_URL` are provided to functions automatically). Deploy with `supabase functions deploy poll-views`.
5. Scheduling needs two Vault secrets so `pg_cron` can call the function (run once, never commit):
   ```sql
   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
   select vault.create_secret('<service role key>', 'service_role_key');
   ```
6. Replace the placeholder channel IDs in the `artists` table (see `seed.sql` TODOs).

## Tests
- `npm test` frontend + Edge Function tests (mocked YouTube). Set `TEST_DATABASE_URL` to also run the
  function against real Postgres.
- `TEST_DATABASE_URL=postgres://… npm run test:sql` SQL tests. **Point it at a scratch database: it drops and
  recreates the `public` schema.** On plain Postgres it applies a test-only Supabase shim
  (`supabase/tests/support/`); with a Supabase DB use `WITH_SHIM=0`.

## Security notes
- The service role key is only read inside the Edge Function. `poll-views` rejects any caller that doesn't
  present exactly that key (gateway JWT check is off so the public anon key can't burn YouTube quota).
- `record_snapshot` and `simulated_tick` are executable by `service_role` only. Clients can't write to any table;
  all writes go through `trade()`.
