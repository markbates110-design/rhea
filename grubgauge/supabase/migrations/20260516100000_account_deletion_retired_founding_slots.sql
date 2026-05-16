-- Account deletion support for the Founding Member program.
--
-- Product rule: Founding Member slots retire forever. Deleting an account
-- must not make that numbered slot available again.

create table if not exists public.retired_founding_member_slots (
  slot_number int primary key check (slot_number between 1 and 100),
  user_id uuid,
  retired_at timestamptz not null default now()
);

create index if not exists retired_founding_member_slots_user_id_idx
  on public.retired_founding_member_slots (user_id);

alter table public.retired_founding_member_slots enable row level security;

drop policy if exists "Public read retired founding member slots"
  on public.retired_founding_member_slots;

create policy "Public read retired founding member slots"
  on public.retired_founding_member_slots for select
  to public
  using (true);

create or replace function public.maybe_award_founding_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  launch_at timestamptz;
  consumed_slot_count int;
  qualifying_days int;
  awarded_slot int;
begin
  if new.user_id is null then
    return new;
  end if;

  if exists (select 1 from public.founding_members where user_id = new.user_id) then
    return new;
  end if;

  select
    (select count(*) from public.founding_members)
    + (select count(*) from public.retired_founding_member_slots)
    into consumed_slot_count;

  if consumed_slot_count >= 100 then
    return new;
  end if;

  select founder_program_starts_at into launch_at from public.app_config where id = 1;
  if launch_at is null then
    return new;
  end if;

  with eligible as (
    select place_id,
           min(created_at) as first_at
    from public.ratings
    where user_id = new.user_id
      and meal_photo_url is not null
      and place_id is not null
      and created_at >= launch_at
    group by place_id
  )
  select count(distinct (first_at at time zone 'UTC')::date)
    into qualifying_days
  from eligible;

  if qualifying_days >= 3 then
    begin
      awarded_slot := nextval('public.founding_members_slot_seq');
    exception when sqlstate '2200H' then
      return new;
    end;

    insert into public.founding_members (user_id, slot_number)
    values (new.user_id, awarded_slot)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

create or replace function public.available_founder_slots()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    0,
    100
      - (select count(*)::int from public.founding_members)
      - (select count(*)::int from public.retired_founding_member_slots)
  );
$$;

grant execute on function public.available_founder_slots() to anon, authenticated;
