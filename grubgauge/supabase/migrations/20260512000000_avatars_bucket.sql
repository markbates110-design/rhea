-- Run in Supabase SQL Editor (or via CLI) once per environment.
-- Provisions the `avatars` storage bucket and its RLS policies.
--
-- Identity model (see rhea-insights.md 2026-05-10 17:50 CT):
--   - Public read so <img src> works without a signed URL on every page paint.
--   - Authenticated insert/update/delete restricted to the user's OWN folder
--     by matching the first path segment to auth.uid()::text.
--   - File size cap is 1 MB on the bucket — client-side resize produces
--     ~50–100 KB JPEGs at 512×512, so 1 MB is generous post-compression.
-- The canonical URL persists on auth.users.raw_user_meta_data as
-- `avatar_url`; this migration adds NO new tables and NO new columns.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read avatars" on storage.objects;
drop policy if exists "Authenticated write own avatar" on storage.objects;
drop policy if exists "Authenticated update own avatar" on storage.objects;
drop policy if exists "Authenticated delete own avatar" on storage.objects;

create policy "Public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Authenticated write own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Authenticated update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Authenticated delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
