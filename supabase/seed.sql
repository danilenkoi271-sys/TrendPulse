-- The top 10 YouTube creators (Trendline never lists more than 10: see migration 20261121000400).
-- TODO: verify this list and each channel ID against youtube.com before launch. Ranking changes over time,
--       and the IDs below are from memory. A wrong ID is simply skipped by poll-views (no snapshot written).
-- TODO: expected_daily_views are rough placeholder estimates. Set each from the channel's real typical daily views.
insert into public.artists (name, youtube_channel_id, expected_daily_views) values
  ('MrBeast',          'UCX6OQ3DkcsbYNE6H8uQQuVA', 100000000),  -- TODO verify channel id + expected views
  ('T-Series',         'UCq-Fj5jknLsUf-MWSy4_brA',  60000000),  -- TODO verify channel id + expected views
  ('Cocomelon',        'UCbCmjCuTUZos6Inko4u57UQ',  40000000),  -- TODO verify channel id + expected views
  ('SET India',        'UCpEhnqL0y41EpW2TvWAHD7Q',  25000000),  -- TODO verify channel id + expected views
  ('Kids Diana Show',  'UCk8GzjMOrta8yxDcKfylJYw',  15000000),  -- TODO verify channel id + expected views
  ('Like Nastya',      'UCJplp5SjeGSdVdwsfb9Q7lQ',  20000000),  -- TODO verify channel id + expected views
  ('Vlad and Niki',    'UCvlE5gTbOvjiolFlEm-c_Ow',  12000000),  -- TODO verify channel id + expected views
  ('WWE',              'UCJ5v_MCY6GNUBTO8-D3XoAg',  25000000),  -- TODO verify channel id + expected views
  ('Zee Music Company','UCFFbwnve3yF62-tVXkTyHqg',  12000000),  -- TODO verify channel id + expected views
  ('PewDiePie',        'UC-lHJZR3Gqxm24_Vd_AJ5Yw',   2500000)   -- TODO verify channel id + expected views
on conflict (youtube_channel_id) do nothing;
