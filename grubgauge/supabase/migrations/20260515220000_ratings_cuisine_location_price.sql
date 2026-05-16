-- Run in Supabase SQL Editor (or via CLI) once per project.
-- Adds derived metadata columns to public.ratings so SEO content and
-- future auto-generated public pages (`/city/[slug]/value-[cuisine]`) can
-- run on simple equality queries instead of LIKE-matching the freeform
-- `venue_address`. All values are derived at rating-creation time from
-- the Google Place Details response — no user input.
--
-- Columns:
--   cuisine       text     normalized vocabulary (`mexican`, `bbq`, ...)
--   city          text     locality from address_components
--   neighborhood  text     neighborhood / sublocality (often null)
--   state         text     2-letter US state (short_name)
--   postal_code   text     ZIP/postal code
--   price_level   smallint Google's 0-4 price tier (free/$/$$/$$$/$$$$)
--
-- All nullable so existing rows keep working; an optional backfill script
-- (scripts/backfill-ratings-metadata.cjs) can populate them later by
-- re-querying Place Details for each unique place_id.
--
-- Indexes target the two query patterns SEO content + auto-generated
-- pages will lean on heaviest:
--   "best [cuisine] in [city]" → (city, cuisine)
--   "cheapest in [city]"       → (city, price_level)
-- Partial-on (city is not null) keeps the index lean while ratings with
-- unknown city (legacy rows, geocoding miss) coexist without polluting it.

alter table public.ratings
  add column if not exists cuisine      text,
  add column if not exists city         text,
  add column if not exists neighborhood text,
  add column if not exists state        text,
  add column if not exists postal_code  text,
  add column if not exists price_level  smallint;

alter table public.ratings
  drop constraint if exists ratings_price_level_check;

alter table public.ratings
  add constraint ratings_price_level_check
  check (price_level is null or price_level between 0 and 4);

create index if not exists ratings_city_cuisine_idx
  on public.ratings (city, cuisine)
  where city is not null;

create index if not exists ratings_city_price_level_idx
  on public.ratings (city, price_level)
  where city is not null;
