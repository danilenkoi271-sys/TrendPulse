-- Trendline: schedules. Requires pg_cron and pg_net (both available on Supabase).
--
-- One-time setup per project (run in the SQL editor; never commit these values):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service role key>',               'service_role_key');
-- The poll-views function rejects any caller that does not present the service role key.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create function public.invoke_poll_views()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  base_url text;
  svc_key  text;
begin
  select decrypted_secret into base_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into svc_key  from vault.decrypted_secrets where name = 'service_role_key';
  if base_url is null or svc_key is null then
    raise warning 'poll-views not invoked: vault secrets project_url / service_role_key are missing';
    return null;
  end if;
  return net.http_post(
    url     := base_url || '/functions/v1/poll-views',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'Authorization', 'Bearer ' || svc_key),
    body    := '{}'::jsonb,
    timeout_milliseconds := 30000);
end;
$$;
revoke execute on function public.invoke_poll_views() from public, anon, authenticated;

-- Estimated ticks, every minute.
select cron.schedule('simulated-ticks', '* * * * *', $$select public.simulated_tick(id) from public.artists;$$);
-- Verified ticks: poll YouTube every 15 minutes.
select cron.schedule('poll-views', '*/15 * * * *', $$select public.invoke_poll_views();$$);
