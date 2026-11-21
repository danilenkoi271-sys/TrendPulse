begin;
insert into artists (id, name, youtube_channel_id, expected_daily_views)
values ('00000000-0000-0000-0000-0000000000d1', 'Tr', 'chan-tr', 1000);
insert into price_ticks (artist_id, price, is_simulated) values ('00000000-0000-0000-0000-0000000000d1', 50, false);
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000e001');
select pg_temp.eq((select balance from profiles where id = '00000000-0000-0000-0000-00000000e001'), 1000, 'signup trigger creates profile with $1,000');

select pg_temp.login('00000000-0000-0000-0000-00000000e001');

select pg_temp.eq(trade('00000000-0000-0000-0000-0000000000d1', 4), 50, 'buy returns executed price');
select pg_temp.eq((select balance from profiles), 800, 'buy debits balance (4 x 50)');
select pg_temp.eq((select shares from holdings), 4, 'buy creates holding');
select pg_temp.ok((select count(*) = 1 and not bool_or(price_is_simulated) and min(shares) = 4 from trades), 'buy writes ledger row (verified price)');

-- estimated price is recorded as such
reset role;
insert into price_ticks (artist_id, price, is_simulated) values ('00000000-0000-0000-0000-0000000000d1', 52.5, true);
select pg_temp.login('00000000-0000-0000-0000-00000000e001');
select pg_temp.eq(trade('00000000-0000-0000-0000-0000000000d1', -1), 52.5, 'sell executes at latest (estimated) tick');
select pg_temp.eq((select balance from profiles), 852.5, 'sell credits balance');
select pg_temp.eq((select shares from holdings), 3, 'sell reduces holding');
select pg_temp.ok((select price_is_simulated from trades order by id desc limit 1), 'ledger records price_is_simulated = true');

-- failures must change nothing
select pg_temp.throws($q$select trade('00000000-0000-0000-0000-0000000000d1', 1000)$q$, '23514', 'insufficient balance fails');
select pg_temp.eq((select balance from profiles), 852.5, 'balance unchanged after failed buy');
select pg_temp.eq((select shares from holdings), 3, 'holding unchanged after failed buy');
select pg_temp.eq((select count(*) from trades), 2, 'no trade row after failed buy');

select pg_temp.throws($q$select trade('00000000-0000-0000-0000-0000000000d1', -4)$q$, '23514', 'overselling fails (no shorting)');
select pg_temp.eq((select balance from profiles), 852.5, 'balance unchanged after failed sell');
select pg_temp.eq((select shares from holdings), 3, 'holding unchanged after failed sell');
select pg_temp.eq((select count(*) from trades), 2, 'no trade row after failed sell');

-- selling something never held
reset role;
insert into artists (id, name, youtube_channel_id, expected_daily_views)
values ('00000000-0000-0000-0000-0000000000d2', 'Other', 'chan-other', 1000);
insert into price_ticks (artist_id, price, is_simulated) values ('00000000-0000-0000-0000-0000000000d2', 10, false);
select pg_temp.login('00000000-0000-0000-0000-00000000e001');
select pg_temp.throws($q$select trade('00000000-0000-0000-0000-0000000000d2', -1)$q$, '23514', 'cannot short an artist never held');
select pg_temp.eq((select balance from profiles), 852.5, 'balance unchanged after failed short');
select pg_temp.ok((select count(*) from holdings) = 1, 'no phantom holding after failed short');

select pg_temp.throws($q$select trade('00000000-0000-0000-0000-0000000000d1', 0)$q$, '22023', 'zero shares rejected');
select pg_temp.throws($q$select trade('00000000-0000-0000-0000-0000000000d1', 0.00001)$q$, '22023', 'dust order rejected');
reset role;
insert into artists (id, name, youtube_channel_id, expected_daily_views)
values ('00000000-0000-0000-0000-0000000000d3', 'NoPx', 'chan-nopx', 1000);
select pg_temp.login('00000000-0000-0000-0000-00000000e001');
select pg_temp.throws($q$select trade('00000000-0000-0000-0000-0000000000d3', 1)$q$, 'P0002', 'no price yet -> rejected');

-- exact round-trip: sell the rest
select trade('00000000-0000-0000-0000-0000000000d1', -3);
select pg_temp.eq((select balance from profiles), 1010, 'balance after closing: 1000 -200 +52.5 +157.5');
select pg_temp.eq((select shares from holdings where artist_id = '00000000-0000-0000-0000-0000000000d1'), 0, 'holding is zero after full sell');

-- unauthenticated
reset role;
select set_config('request.jwt.claim.sub', '', true);
set local role anon;
select pg_temp.ok(not has_function_privilege('anon', 'trade(uuid,numeric)', 'execute'), 'anon cannot execute trade');
reset role;
rollback;
