begin;
insert into artists (id, name, youtube_channel_id, expected_daily_views) values
  ('00000000-0000-0000-0000-0000000000f1', 'Alpha', 'chan-a', 1000),
  ('00000000-0000-0000-0000-0000000000f2', 'Beta',  'chan-b', 1000);
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000e101');

-- Hand-calculated fixture (running-average cost):
--  Alpha: buy 10 @ 10.00 ; buy 10 @ 20.00 -> 20 sh, avg 15.00 ; sell 5 @ 30 -> 15 sh, avg stays 15.00
--  Beta : buy 4 @ 25.00 -> 4 sh avg 25.00
--  Latest: Alpha 18.00 (verified), Beta 22.50 (estimated)
--  cash = 1000 -100 -200 +150 -100 = 750
--  Alpha: value 15*18 = 270.00 ; pnl 15*(18-15)  = +45.00
--  Beta : value 4*22.5 = 90.00 ; pnl 4*(22.5-25) = -10.00
--  holdings 360.00 ; total 1110.00 ; pnl +35.00
insert into price_ticks (artist_id, price, is_simulated) values ('00000000-0000-0000-0000-0000000000f1', 10, false);
select pg_temp.login('00000000-0000-0000-0000-00000000e101');
select trade('00000000-0000-0000-0000-0000000000f1', 10);
reset role; insert into price_ticks (artist_id, price) values ('00000000-0000-0000-0000-0000000000f1', 20);
select pg_temp.login('00000000-0000-0000-0000-00000000e101');
select trade('00000000-0000-0000-0000-0000000000f1', 10);
reset role; insert into price_ticks (artist_id, price) values ('00000000-0000-0000-0000-0000000000f1', 30);
select pg_temp.login('00000000-0000-0000-0000-00000000e101');
select trade('00000000-0000-0000-0000-0000000000f1', -5);
reset role; insert into price_ticks (artist_id, price) values ('00000000-0000-0000-0000-0000000000f2', 25);
select pg_temp.login('00000000-0000-0000-0000-00000000e101');
select trade('00000000-0000-0000-0000-0000000000f2', 4);
reset role;
insert into price_ticks (artist_id, price, is_simulated) values
  ('00000000-0000-0000-0000-0000000000f1', 18, false),
  ('00000000-0000-0000-0000-0000000000f2', 22.5, true);
select pg_temp.login('00000000-0000-0000-0000-00000000e101');

create temp table s on commit drop as select portfolio_summary() j;
grant select on s to authenticated;
select pg_temp.eq((select (j->>'balance')::numeric from s), 750, 'cash balance');
select pg_temp.eq((select (j->>'holdings_value')::numeric from s), 360, 'holdings value');
select pg_temp.eq((select (j->>'total_value')::numeric from s), 1110, 'total value');
select pg_temp.eq((select (j->>'unrealised_pnl')::numeric from s), 35, 'total unrealised P&L');
select pg_temp.ok((select (j->>'any_estimated')::boolean from s), 'any_estimated flag set when a holding uses an estimated price');
select pg_temp.eq((select (h->>'avg_cost')::numeric from s, jsonb_array_elements(j->'holdings') h where h->>'name'='Alpha'), 15, 'Alpha avg cost stays 15 after a sell');
select pg_temp.eq((select (h->>'market_value')::numeric from s, jsonb_array_elements(j->'holdings') h where h->>'name'='Alpha'), 270, 'Alpha market value');
select pg_temp.eq((select (h->>'unrealised_pnl')::numeric from s, jsonb_array_elements(j->'holdings') h where h->>'name'='Alpha'), 45, 'Alpha P&L');
select pg_temp.ok((select not (h->>'price_is_simulated')::boolean from s, jsonb_array_elements(j->'holdings') h where h->>'name'='Alpha'), 'Alpha price is verified');
select pg_temp.eq((select (h->>'unrealised_pnl')::numeric from s, jsonb_array_elements(j->'holdings') h where h->>'name'='Beta'), -10, 'Beta P&L');
select pg_temp.ok((select (h->>'price_is_simulated')::boolean from s, jsonb_array_elements(j->'holdings') h where h->>'name'='Beta'), 'Beta price flagged estimated');

-- Sold-out positions disappear from the summary; other users see only their own.
reset role;
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000e102');
select pg_temp.login('00000000-0000-0000-0000-00000000e102');
select pg_temp.ok(jsonb_array_length(portfolio_summary()->'holdings') = 0 and (portfolio_summary()->>'total_value')::numeric = 1000, 'another user sees an empty portfolio worth $1,000');
reset role;
rollback;
