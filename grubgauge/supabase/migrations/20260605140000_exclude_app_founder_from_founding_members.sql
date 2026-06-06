-- The app founder (NEXT_PUBLIC_APP_FOUNDER_USER_ID) carries "The Founder"
-- badge only — they must not consume a numbered founding member slot.
-- Store the id in app_config so the SECURITY DEFINER trigger can skip them.

alter table public.app_config
  add column if not exists app_founder_user_id uuid;

comment on column public.app_config.app_founder_user_id is
  'Matches NEXT_PUBLIC_APP_FOUNDER_USER_ID. Excluded from founding_members awards.';

-- Keep in sync with deploy env (GrubGauge production founder).
update public.app_config
set app_founder_user_id = 'dd29aa4d-af85-4c08-a052-cbac99f627a6'::uuid
where id = 1;

-- Remove founder if they were awarded a slot before this guard existed.
delete from public.founding_members fm
using public.app_config c
where c.id = 1
  and c.app_founder_user_id is not null
  and fm.user_id = c.app_founder_user_id;

-- Next real qualifier should receive slot #1 when the table is empty.
do $$
begin
  if not exists (select 1 from public.founding_members) then
    perform setval('public.founding_members_slot_seq', 1, false);
  end if;
end;
$$;

create or replace function public.maybe_award_founding_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  launch_at timestamptz;
  app_founder_id uuid;
  consumed_slot_count int;
  qualifying_days int;
  awarded_slot int;
begin
  if new.user_id is null then
    return new;
  end if;

  select app_founder_user_id into app_founder_id
  from public.app_config
  where id = 1;

  if app_founder_id is not null and new.user_id = app_founder_id then
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
