-- Store venue coordinates from Google Place Details `geometry` at rating time.
-- Nullable — legacy rows without coords still work; city/state fallback remains
-- in the nearby carousel until those spots are re-rated.

alter table public.ratings
  add column if not exists latitude  double precision,
  add column if not exists longitude double precision;

alter table public.ratings
  drop constraint if exists ratings_latitude_check;

alter table public.ratings
  add constraint ratings_latitude_check
  check (latitude is null or (latitude >= -90 and latitude <= 90));

alter table public.ratings
  drop constraint if exists ratings_longitude_check;

alter table public.ratings
  add constraint ratings_longitude_check
  check (longitude is null or (longitude >= -180 and longitude <= 180));

create index if not exists ratings_lat_lng_idx
  on public.ratings (latitude, longitude)
  where latitude is not null and longitude is not null;
