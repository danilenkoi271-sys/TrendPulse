begin;
select pg_temp.eq((select count(*) from artists), 0, 'scratch db starts with no artists');
\i ../seed.sql
select pg_temp.eq((select count(*) from artists), 10, 'seed loads exactly 10 creators');
select pg_temp.throws($q$insert into artists (name, youtube_channel_id, expected_daily_views) values ('Eleventh','UC_eleventh',1)$q$, '23514', 'an 11th creator is rejected');
select pg_temp.ok((select count(*) from artists where youtube_channel_id like '%TODO%') = 0, 'seed has no placeholder channel ids');
rollback;
