-- Trendline: core schema, signup trigger, RLS.
-- All balances are PLAY MONEY with no cash value.

create table public.artists (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  youtube_channel_id    text not null unique,
  expected_daily_views  numeric not null check (expected_daily_views > 0),
  base_price            numeric not null default 100,
  k                     numeric not null default 0.5,
  created_at            timestamptz not null default now()
);

create table public.view_snapshots (
  id           bigint generated always as identity primary key,
  artist_id    uuid not null references public.artists(id) on delete cascade,
  total_views  bigint not null,
  fetched_at   timestamptz not null default now()
);
create index view_snapshots_artist_fetched_idx
  on public.view_snapshots (artist_id, fetched_at desc);

create table public.price_ticks (
  id            bigint generated always as identity primary key,
  artist_id     uuid not null references public.artists(id) on delete cascade,
  price         numeric not null,
  is_simulated  boolean not null default false,
  created_at    timestamptz not null default now()
);
create index price_ticks_artist_id_idx
  on public.price_ticks (artist_id, id desc);

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  balance       numeric not null default 1000 check (balance >= 0)
);

create table public.holdings (
  user_id    uuid references public.profiles(id) on delete cascade,
  artist_id  uuid references public.artists(id) on delete cascade,
  shares     numeric not null default 0 check (shares >= 0),
  primary key (user_id, artist_id)
);

-- Ledger. shares > 0 = buy, shares < 0 = sell.
create table public.trades (
  id                  bigint generated always as identity primary key,
  user_id             uuid references public.profiles(id) on delete cascade,
  artist_id           uuid references public.artists(id) on delete cascade,
  shares              numeric not null,
  price               numeric not null,
  price_is_simulated  boolean not null,
  created_at          timestamptz not null default now()
);
create index trades_user_id_idx on public.trades (user_id, id desc);

-- New user -> profile with $1,000 play money.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row level security -------------------------------------------------------
alter table public.artists        enable row level security;
alter table public.view_snapshots enable row level security;
alter table public.price_ticks    enable row level security;
alter table public.profiles       enable row level security;
alter table public.holdings       enable row level security;
alter table public.trades         enable row level security;

create policy "artists readable"        on public.artists        for select to authenticated using (true);
create policy "view_snapshots readable" on public.view_snapshots for select to authenticated using (true);
create policy "price_ticks readable"    on public.price_ticks    for select to authenticated using (true);
create policy "own profile"  on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own holdings" on public.holdings for select to authenticated using (user_id = (select auth.uid()));
create policy "own trades"   on public.trades   for select to authenticated using (user_id = (select auth.uid()));

-- Belt and braces: clients never write directly, whatever default grants exist.
revoke insert, update, delete, truncate on
  public.artists, public.view_snapshots, public.price_ticks,
  public.profiles, public.holdings, public.trades
  from anon, authenticated;
revoke all on
  public.artists, public.view_snapshots, public.price_ticks,
  public.profiles, public.holdings, public.trades
  from anon;

-- Realtime: the artist page subscribes to price_ticks inserts.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.price_ticks;
  end if;
end $$;
