-- Trendline lists only the top 10 YouTube creators. Enforced in the database, not just the seed.
create function public.enforce_max_artists()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from public.artists) >= 10 then
    raise exception 'Trendline lists at most 10 creators' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger artists_max_10
  before insert on public.artists
  for each row execute function public.enforce_max_artists();
