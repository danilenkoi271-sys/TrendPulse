begin;
-- artist: base 100, k 0.5, expects 1000 views/day
insert into artists (id, name, youtube_channel_id, expected_daily_views)
values ('00000000-0000-0000-0000-0000000000a1', 'T', 'chan-t', 1000);

create or replace function pg_temp.snap(ts timestamptz, views bigint) returns void language sql as $$
  insert into view_snapshots (artist_id, total_views, fetched_at)
  values ('00000000-0000-0000-0000-0000000000a1', views, ts) $$;
create or replace function pg_temp.price() returns numeric language sql as $$
  select compute_real_price('00000000-0000-0000-0000-0000000000a1') $$;

-- no snapshots -> base
select pg_temp.eq(pg_temp.price(), 100, 'no snapshots returns base');
-- one snapshot -> zero elapsed -> base
select pg_temp.snap('2026-01-08 00:00+00', 8000);
select pg_temp.eq(pg_temp.price(), 100, 'zero elapsed returns base');

-- on pace: Jan1=1000, Jan8=8000 -> +7000 in 7 days
select pg_temp.snap('2026-01-01 00:00+00', 1000);
select pg_temp.eq(pg_temp.price(), 100, 'on pace returns base');

-- ahead: latest 2x pace -> ratio 2 -> 100*(1+0.5*1)=150
insert into view_snapshots (artist_id, total_views, fetched_at)
values ('00000000-0000-0000-0000-0000000000a1', 8000 + 14000, '2026-01-15 00:00+00');
-- now latest=Jan15, earliest = most recent at/before Jan8 = Jan8 (8000). delta 14000 / 7000 = 2
select pg_temp.eq(pg_temp.price(), 150, 'ahead of pace returns above base (ratio 2 -> 150)');

-- behind: latest only +3500 over 7 days -> ratio 0.5 -> 100*(1+0.5*-0.5)=75
insert into view_snapshots (artist_id, total_views, fetched_at)
values ('00000000-0000-0000-0000-0000000000a1', 22000 + 3500, '2026-01-22 00:00+00');
select pg_temp.eq(pg_temp.price(), 75, 'behind pace returns below base (ratio 0.5 -> 75)');

-- window uses most recent snapshot at/before latest-7d, not the oldest
-- (Jan22 - 7d = Jan15 => earliest = Jan15 at 22000, not Jan1)
select pg_temp.ok(pg_temp.price() = 75, 'earliest is the latest snapshot at or before 7 days back');

-- under 7 days: fresh artist, uses the oldest snapshot
insert into artists (id, name, youtube_channel_id, expected_daily_views)
values ('00000000-0000-0000-0000-0000000000a2', 'U', 'chan-u', 1000);
insert into view_snapshots (artist_id, total_views, fetched_at) values
  ('00000000-0000-0000-0000-0000000000a2', 1000, '2026-02-01 00:00+00'),
  ('00000000-0000-0000-0000-0000000000a2', 1500, '2026-02-02 00:00+00'),
  ('00000000-0000-0000-0000-0000000000a2', 3000, '2026-02-03 00:00+00');
-- oldest = Feb1, elapsed 2 days, expected 2000, delta 2000 -> ratio 1 -> base
select pg_temp.eq(compute_real_price('00000000-0000-0000-0000-0000000000a2'), 100,
  'under 7 days uses the oldest snapshot (on pace -> base)');
insert into view_snapshots (artist_id, total_views, fetched_at)
values ('00000000-0000-0000-0000-0000000000a2', 3000 + 3000, '2026-02-04 00:00+00');
-- elapsed 3d, expected 3000, delta 5000 -> ratio 5/3 -> 100*(1+0.5*2/3)=133.33..
select pg_temp.ok(abs(compute_real_price('00000000-0000-0000-0000-0000000000a2') - 133.3333333) < 0.001,
  'under 7 days: price from oldest snapshot ratio');

-- views going backwards never produce negative delta
insert into artists (id, name, youtube_channel_id, expected_daily_views)
values ('00000000-0000-0000-0000-0000000000a3', 'V', 'chan-v', 1000);
insert into view_snapshots (artist_id, total_views, fetched_at) values
  ('00000000-0000-0000-0000-0000000000a3', 9000, '2026-03-01 00:00+00'),
  ('00000000-0000-0000-0000-0000000000a3', 8000, '2026-03-02 00:00+00');
select pg_temp.eq(compute_real_price('00000000-0000-0000-0000-0000000000a3'), 50,
  'negative view delta is floored at zero (ratio 0 -> 50)');
rollback;
