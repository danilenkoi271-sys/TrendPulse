begin;
insert into artists (id, name, youtube_channel_id, expected_daily_views)
values ('00000000-0000-0000-0000-0000000000c1', 'Sim', 'chan-sim', 1000);

-- no real tick yet: anchors on base price (100)
select simulated_tick('00000000-0000-0000-0000-0000000000c1');
select pg_temp.ok((select price between 95 and 105 and is_simulated from price_ticks order by id desc limit 1),
  'with no real tick, anchors on base_price and is flagged simulated');

insert into price_ticks (artist_id, price, is_simulated) values ('00000000-0000-0000-0000-0000000000c1', 200, false);
do $$
declare i int; p numeric; lo numeric := 1e9; hi numeric := 0; a uuid := '00000000-0000-0000-0000-0000000000c1';
begin
  for i in 1..1000 loop
    p := simulated_tick(a);
    if p < 190 or p > 210 then raise exception 'FAIL: tick % outside +/-5%% of 200', p; end if;
    lo := least(lo, p); hi := greatest(hi, p);
  end loop;
  -- no compounding: random walk of 1000 steps would blow well past +/-5%; spread must be genuinely wide though
  if hi - lo < 10 then raise exception 'FAIL: ticks suspiciously narrow (% .. %)', lo, hi; end if;
  raise notice 'ok - 1000 simulated ticks within [190,210], observed % .. %', lo, hi;
end $$;
select pg_temp.ok((select count(*) from price_ticks where is_simulated) = 1001, 'every call inserted a simulated tick');
select pg_temp.ok(not has_function_privilege('authenticated', 'simulated_tick(uuid)', 'execute'), 'authenticated cannot execute simulated_tick');
select pg_temp.ok(not has_function_privilege('anon', 'simulated_tick(uuid)', 'execute'), 'anon cannot execute simulated_tick');
select pg_temp.ok(has_function_privilege('service_role', 'simulated_tick(uuid)', 'execute'), 'service_role can execute simulated_tick');
rollback;
