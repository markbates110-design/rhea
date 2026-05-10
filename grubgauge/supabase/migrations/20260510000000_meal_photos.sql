-- Run in Supabase SQL Editor (or via CLI) once per project.
-- Optional food photo URL per rating.
alter table public.ratings add column if not exists meal_photo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meal-photos',
  'meal-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read meal photos" on storage.objects;
drop policy if exists "Anonymous upload meal photos" on storage.objects;

create policy "Public read meal photos"
  on storage.objects for select
  using (bucket_id = 'meal-photos');

create policy "Anonymous upload meal photos"
  on storage.objects for insert
  with check (bucket_id = 'meal-photos');
