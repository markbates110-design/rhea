-- Run in Supabase SQL Editor (or via CLI) once per project.
-- Personal-data identity column: links a rating to a Supabase auth user.
-- Nullable so guest rows (device-scoped only) remain valid.

alter table public.ratings
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists ratings_user_id_idx on public.ratings (user_id);
create index if not exists ratings_device_id_idx on public.ratings (device_id);
