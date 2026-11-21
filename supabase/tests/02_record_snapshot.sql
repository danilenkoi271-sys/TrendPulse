begin;
insert into artists (id, name, youtube_channel_id, expected_daily_views)
values ('00000000-0000-0000-0000-0000000000b1', 'R', 'chan-r', 1000);

-- First snapshot: single point -> base price, real tick.
select pg_temp.eq(record_snapshot('00000000-0000-0000-0000-0000000000b1', 1000), 100, 'first snapshot yields base price');
select pg_temp.ok((select count(*) from view_snapshots) = 1 and
                  (select count(*) from price_ticks where not is_simulated) = 1, 'snapshot + real tick written');

-- Huge jump in views should be clamped to +10%.
update view_snapshots set fetched_at = fetched_at - interval '7 days';
update price_ticks set created_at = created_at - interval '7 days';
select pg_temp.eq(record_snapshot('00000000-0000-0000-0000-0000000000b1', 100000000), 110, 'upward move clamped to +10%');
-- Next one is again clamped relative to the previous REAL tick (110): <= 121
select pg_temp.eq(record_snapshot('00000000-0000-0000-0000-0000000000b1', 200000000), 121, 'second upward move clamped to +10% of previous real tick');

-- Collapse -> clamp to -10%
insert into artists (id, name, youtube_channel_id, expected_daily_views)
values ('00000000-0000-0000-0000-0000000000b2', 'S', 'chan-s', 1000);
insert into price_ticks (artist_id, price, is_simulated) values ('00000000-0000-0000-0000-0000000000b2', 100, false);
insert into view_snapshots (artist_id, total_views, fetched_at)
values ('00000000-0000-0000-0000-0000000000b2', 5000, now() - interval '7 days');
select pg_temp.eq(record_snapshot('00000000-0000-0000-0000-0000000000b2', 5000), 90, 'downward move clamped to -10%');

-- Simulated ticks must not be used as the clamp anchor.
insert into price_ticks (artist_id, price, is_simulated) values ('00000000-0000-0000-0000-0000000000b2', 94.5, true);
select pg_temp.ok(record_snapshot('00000000-0000-0000-0000-0000000000b2', 5000) between 81 and 99, 'clamp anchors on last real tick, not simulated');

-- Property: across many snapshots no real tick moves >10% from previous real tick.
do $$
declare i int; prev numeric := 100; cur numeric; a uuid := '00000000-0000-0000-0000-0000000000b3';
begin
  insert into artists (id, name, youtube_channel_id, expected_daily_views) values (a, 'P', 'chan-p', 500);
  for i in 1..60 loop
    update view_snapshots set fetched_at = fetched_at - interval '1 day' where artist_id = a;
    cur := record_snapshot(a, (random() * 1e7)::bigint);
    if abs(cur - prev) > prev * 0.10 + 0.01 then
      raise exception 'FAIL: real tick moved from % to %', prev, cur;
    end if;
    prev := cur;
  end loop;
  raise notice 'ok - 60 random snapshots all within +/-10%%';
end $$;

-- Clients can't call it.
select pg_temp.ok(not has_function_privilege('authenticated', 'record_snapshot(uuid,bigint)', 'execute'), 'authenticated cannot execute record_snapshot');
select pg_temp.ok(not has_function_privilege('anon', 'record_snapshot(uuid,bigint)', 'execute'), 'anon cannot execute record_snapshot');
select pg_temp.ok(has_function_privilege('service_role', 'record_snapshot(uuid,bigint)', 'execute'), 'service_role can execute record_snapshot');
rollback;
