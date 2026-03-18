alter table public.teams
  add column if not exists home_city_state text,
  add column if not exists home_lat double precision,
  add column if not exists home_lng double precision;

alter table public.teams
  add constraint teams_home_lat_range
  check (home_lat is null or (home_lat >= -90 and home_lat <= 90));

alter table public.teams
  add constraint teams_home_lng_range
  check (home_lng is null or (home_lng >= -180 and home_lng <= 180));
