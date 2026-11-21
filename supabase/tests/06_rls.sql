begin;
insert into artists (id, name, youtube_channel_id, expected_daily_views)
values ('00000000-0000-0000-0000-000000000a01', 'Rls', 'chan-rls', 1000);
insert into price_ticks (artist_id, price) values ('00000000-0000-0000-0000-000000000a01', 10);
insert into view_snapshots (artist_id, total_views) values ('00000000-0000-0000-0000-000000000a01', 5);
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000a111'), ('00000000-0000-0000-0000-00000000a222');
select pg_temp.login('00000000-0000-0000-0000-00000000a111');
select trade('00000000-0000-0000-0000-000000000a01', 2);
reset role;
select pg_temp.login('00000000-0000-0000-0000-00000000a222');
select trade('00000000-0000-0000-0000-000000000a01', 3);

-- user B sees only B
select pg_temp.ok((select count(*) from profiles) = 1 and (select id from profiles) = '00000000-0000-0000-0000-00000000a222', 'user sees only own profile');
select pg_temp.ok((select count(*) from holdings) = 1 and (select shares from holdings) = 3, 'user sees only own holdings');
select pg_temp.ok((select count(*) from trades) = 1 and (select shares from trades) = 3, 'user sees only own trades');
select pg_temp.ok((select count(*) from artists where id = '00000000-0000-0000-0000-000000000a01') = 1 and (select count(*) from price_ticks where artist_id = '00000000-0000-0000-0000-000000000a01') = 1 and (select count(*) from view_snapshots where artist_id = '00000000-0000-0000-0000-000000000a01') = 1, 'user can read artists, ticks, snapshots');

-- Direct writes are refused (permission denied or RLS) on every table.
select pg_temp.throws($q$insert into artists (name, youtube_channel_id, expected_daily_views) values ('x','y',1)$q$, '42501', 'cannot insert artists');
select pg_temp.throws($q$update artists set name = 'hacked'$q$, '42501', 'cannot update artists');
select pg_temp.throws($q$delete from artists$q$, '42501', 'cannot delete artists');
select pg_temp.throws($q$insert into price_ticks (artist_id, price) values ('00000000-0000-0000-0000-000000000a01', 1)$q$, '42501', 'cannot insert price_ticks');
select pg_temp.throws($q$update price_ticks set price = 1$q$, '42501', 'cannot update price_ticks');
select pg_temp.throws($q$insert into view_snapshots (artist_id, total_views) values ('00000000-0000-0000-0000-000000000a01', 1)$q$, '42501', 'cannot insert view_snapshots');
select pg_temp.throws($q$update profiles set balance = 1000000$q$, '42501', 'cannot update own balance');
select pg_temp.throws($q$insert into profiles (id) values (gen_random_uuid())$q$, '42501', 'cannot insert profiles');
select pg_temp.throws($q$delete from profiles$q$, '42501', 'cannot delete profiles');
select pg_temp.throws($q$update holdings set shares = 999$q$, '42501', 'cannot update own holdings');
select pg_temp.throws($q$insert into holdings (user_id, artist_id, shares) values ('00000000-0000-0000-0000-00000000a222','00000000-0000-0000-0000-000000000a01', 99)$q$, '42501', 'cannot insert holdings');
select pg_temp.throws($q$delete from trades$q$, '42501', 'cannot delete trades');
select pg_temp.throws($q$insert into trades (user_id, artist_id, shares, price, price_is_simulated) values ('00000000-0000-0000-0000-00000000a222','00000000-0000-0000-0000-000000000a01', 1, 1, false)$q$, '42501', 'cannot insert trades');
select pg_temp.throws($q$select simulated_tick('00000000-0000-0000-0000-000000000a01')$q$, '42501', 'cannot call simulated_tick');
select pg_temp.throws($q$select record_snapshot('00000000-0000-0000-0000-000000000a01', 1)$q$, '42501', 'cannot call record_snapshot');
reset role;

-- anon sees nothing
set local role anon;
select pg_temp.throws($q$select count(*) from profiles$q$, '42501', 'anon cannot read profiles');
select pg_temp.throws($q$select count(*) from artists$q$, '42501', 'anon cannot read artists');
reset role;
rollback;
