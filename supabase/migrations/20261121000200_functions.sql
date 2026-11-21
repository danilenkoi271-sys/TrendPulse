-- Trendline: pricing, trading and portfolio functions.

-- Pure read: price implied by the rolling 7-day view pace.
create function public.compute_real_price(p_artist uuid)
returns numeric
language plpgsql
stable
set search_path = public
as $$
declare
  a        public.artists;
  latest   public.view_snapshots;
  earliest public.view_snapshots;
  elapsed_days numeric;
  expected numeric;
  ratio    numeric;
begin
  select * into a from public.artists where id = p_artist;
  if not found then
    raise exception 'artist % not found', p_artist;
  end if;

  select * into latest from public.view_snapshots
   where artist_id = p_artist
   order by fetched_at desc, id desc limit 1;
  if not found then
    return a.base_price;
  end if;

  select * into earliest from public.view_snapshots
   where artist_id = p_artist
     and fetched_at <= latest.fetched_at - interval '7 days'
   order by fetched_at desc, id desc limit 1;
  if not found then
    select * into earliest from public.view_snapshots
     where artist_id = p_artist
     order by fetched_at asc, id asc limit 1;
  end if;

  elapsed_days := extract(epoch from (latest.fetched_at - earliest.fetched_at)) / 86400;
  if elapsed_days <= 0 then
    return a.base_price;
  end if;

  expected := a.expected_daily_views * elapsed_days;
  ratio := greatest(latest.total_views - earliest.total_views, 0)::numeric / expected;
  return a.base_price * (1 + a.k * (ratio - 1));
end;
$$;

-- Service-only: store a YouTube snapshot and a verified (real) tick.
create function public.record_snapshot(p_artist uuid, p_total_views bigint)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  a         public.artists;
  last_real numeric;
  new_price numeric;
begin
  select * into a from public.artists where id = p_artist;
  if not found then
    raise exception 'artist % not found', p_artist;
  end if;

  insert into public.view_snapshots (artist_id, total_views)
  values (p_artist, p_total_views);

  select price into last_real from public.price_ticks
   where artist_id = p_artist and not is_simulated
   order by id desc limit 1;
  last_real := coalesce(last_real, a.base_price);

  new_price := round(
    least(greatest(public.compute_real_price(p_artist), last_real * 0.90), last_real * 1.10),
    2);

  insert into public.price_ticks (artist_id, price, is_simulated)
  values (p_artist, new_price, false);
  return new_price;
end;
$$;

-- Service/cron-only: estimated tick within +/-5% of the last verified tick.
-- Anchored to the real tick, so simulated ticks never compound.
create function public.simulated_tick(p_artist uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  a      public.artists;
  anchor numeric;
  p      numeric;
begin
  select * into a from public.artists where id = p_artist;
  if not found then
    raise exception 'artist % not found', p_artist;
  end if;

  select price into anchor from public.price_ticks
   where artist_id = p_artist and not is_simulated
   order by id desc limit 1;
  anchor := coalesce(anchor, a.base_price);

  p := round((anchor * (1 + (random() * 0.10 - 0.05)))::numeric, 2);
  insert into public.price_ticks (artist_id, price, is_simulated)
  values (p_artist, p, true);
  return p;
end;
$$;

-- Buy (positive) or sell (negative) at the latest tick, real or estimated.
create function public.trade(p_artist uuid, p_shares numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  uid  uuid := auth.uid();
  px   numeric;
  sim  boolean;
  cost numeric;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_shares is null or p_shares = 0 then
    raise exception 'shares must be non-zero' using errcode = '22023';
  end if;

  select price, is_simulated into px, sim from public.price_ticks
   where artist_id = p_artist
   order by id desc limit 1;
  if not found then
    raise exception 'no price available for this artist yet' using errcode = 'P0002';
  end if;

  cost := round(p_shares * px, 2);
  if cost = 0 then
    raise exception 'order too small' using errcode = '22023';
  end if;

  -- CHECK constraints (balance >= 0, shares >= 0) abort the whole transaction.
  update public.profiles set balance = balance - cost where id = uid;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  -- A CHECK on the proposed row fires before ON CONFLICT resolves, so a sell
  -- can't be written as an upsert: buys upsert, sells update an existing row.
  if p_shares > 0 then
    insert into public.holdings (user_id, artist_id, shares)
    values (uid, p_artist, p_shares)
    on conflict (user_id, artist_id)
    do update set shares = public.holdings.shares + excluded.shares;
  else
    update public.holdings set shares = shares + p_shares
     where user_id = uid and artist_id = p_artist;
    if not found then
      raise exception 'cannot sell shares you do not hold' using errcode = '23514';
    end if;
  end if;

  insert into public.trades (user_id, artist_id, shares, price, price_is_simulated)
  values (uid, p_artist, p_shares, px, sim);

  return px;
end;
$$;

-- Average cost by the running-average method: buys add to cost basis,
-- sells remove shares at the current average (average itself is unchanged).
create function public.position_avg_cost(p_user uuid, p_artist uuid)
returns numeric
language plpgsql
stable
set search_path = public
as $$
declare
  t record;
  held  numeric := 0;
  basis numeric := 0;
begin
  for t in
    select shares, price from public.trades
     where user_id = p_user and artist_id = p_artist
     order by id
  loop
    if t.shares > 0 then
      held := held + t.shares;
      basis := basis + t.shares * t.price;
    else
      if held > 0 then
        basis := basis - (-t.shares) * (basis / held);
        held := held + t.shares;
      end if;
    end if;
  end loop;
  if held <= 0 then
    return 0;
  end if;
  return basis / held;
end;
$$;

-- Read-only snapshot of the caller's account. Runs as the caller, so RLS applies.
create function public.portfolio_summary()
returns jsonb
language sql
stable
set search_path = public
as $$
  with h as (
    select
      ho.artist_id,
      ar.name,
      ho.shares,
      lt.price                          as latest_price,
      lt.is_simulated                   as price_is_simulated,
      lt.created_at                     as price_at,
      public.position_avg_cost(ho.user_id, ho.artist_id) as avg_cost
    from public.holdings ho
    join public.artists ar on ar.id = ho.artist_id
    join lateral (
      select price, is_simulated, created_at from public.price_ticks
       where artist_id = ho.artist_id order by id desc limit 1
    ) lt on true
    where ho.user_id = (select auth.uid()) and ho.shares > 0
  ),
  rows as (
    select
      artist_id, name, shares, latest_price, price_is_simulated, price_at,
      round(avg_cost, 4)                              as avg_cost,
      round(shares * latest_price, 2)                 as market_value,
      round(shares * (latest_price - avg_cost), 2)    as unrealised_pnl
    from h
  )
  select jsonb_build_object(
    'balance',        (select balance from public.profiles where id = (select auth.uid())),
    'holdings_value', coalesce((select sum(market_value) from rows), 0),
    'total_value',    (select balance from public.profiles where id = (select auth.uid()))
                      + coalesce((select sum(market_value) from rows), 0),
    'unrealised_pnl', coalesce((select sum(unrealised_pnl) from rows), 0),
    'any_estimated',  coalesce((select bool_or(price_is_simulated) from rows), false),
    'holdings',       coalesce((select jsonb_agg(to_jsonb(r) order by r.name) from rows r), '[]'::jsonb)
  );
$$;

-- Privileges ----------------------------------------------------------------
revoke execute on function public.record_snapshot(uuid, bigint) from public, anon, authenticated;
revoke execute on function public.simulated_tick(uuid)          from public, anon, authenticated;
grant  execute on function public.record_snapshot(uuid, bigint) to service_role;
grant  execute on function public.simulated_tick(uuid)          to service_role;

revoke execute on function public.trade(uuid, numeric) from public, anon;
grant  execute on function public.trade(uuid, numeric) to authenticated;
revoke execute on function public.portfolio_summary()  from public, anon;
grant  execute on function public.portfolio_summary()  to authenticated;
revoke execute on function public.position_avg_cost(uuid, uuid) from public, anon;
grant  execute on function public.position_avg_cost(uuid, uuid) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
