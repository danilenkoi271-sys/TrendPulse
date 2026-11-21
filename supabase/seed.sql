-- Sample artists. Names are fictional.
-- TODO: replace placeholder youtube_channel_id values with real channel IDs (UC...).
-- TODO: set expected_daily_views from each channel's real typical daily views.
insert into public.artists (name, youtube_channel_id, expected_daily_views) values
  ('Nova Kline',        'UC_TODO_REPLACE_CHANNEL_ID_1', 120000),  -- TODO: placeholder channel id + expected views
  ('The Lantern Club',  'UC_TODO_REPLACE_CHANNEL_ID_2',  45000),  -- TODO: placeholder channel id + expected views
  ('DJ Marmalade',      'UC_TODO_REPLACE_CHANNEL_ID_3',  18000)   -- TODO: placeholder channel id + expected views
on conflict (youtube_channel_id) do nothing;
