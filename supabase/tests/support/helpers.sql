-- Tiny assertion helpers (pgTAP is not available everywhere).
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FAIL: %', msg; end if;
  raise notice 'ok - %', msg;
end $$;
create or replace function pg_temp.eq(got numeric, want numeric, msg text) returns void language plpgsql as $$
begin
  if got is distinct from want then raise exception 'FAIL: % (got %, want %)', msg, got, want; end if;
  raise notice 'ok - %', msg;
end $$;
-- Expect the statement to raise; optionally match SQLSTATE.
create or replace function pg_temp.throws(stmt text, state text, msg text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if state is not null and sqlstate <> state then
      raise exception 'FAIL: % (raised %, wanted %: %)', msg, sqlstate, state, sqlerrm;
    end if;
    raise notice 'ok - % [%]', msg, sqlstate;
    return;
  end;
  raise exception 'FAIL: % (nothing raised)', msg;
end $$;
-- Act as a signed-in user (RLS applies). Call "reset role" to return.
create or replace function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
