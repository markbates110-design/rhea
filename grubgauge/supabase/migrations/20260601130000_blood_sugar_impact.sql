-- Private blood sugar impact tracking (owner-only via RLS).

alter table public.profiles
  add column if not exists track_blood_sugar_impact boolean not null default false,
  add column if not exists blood_sugar_disclaimer_accepted_at timestamptz;

create table if not exists public.rating_personal_health (
  rating_id uuid primary key references public.ratings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  impact text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rating_personal_health_impact_check
    check (impact is null or impact in ('low', 'medium', 'high')),
  constraint rating_personal_health_has_content_check
    check (
      impact is not null
      or (notes is not null and length(trim(notes)) > 0)
    )
);

create index if not exists rating_personal_health_user_id_idx
  on public.rating_personal_health (user_id);

alter table public.rating_personal_health enable row level security;

drop policy if exists "Owner read rating_personal_health" on public.rating_personal_health;
drop policy if exists "Owner insert rating_personal_health" on public.rating_personal_health;
drop policy if exists "Owner update rating_personal_health" on public.rating_personal_health;
drop policy if exists "Owner delete rating_personal_health" on public.rating_personal_health;

create policy "Owner read rating_personal_health"
  on public.rating_personal_health for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Owner insert rating_personal_health"
  on public.rating_personal_health for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Owner update rating_personal_health"
  on public.rating_personal_health for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Owner delete rating_personal_health"
  on public.rating_personal_health for delete
  to authenticated
  using (auth.uid() = user_id);
