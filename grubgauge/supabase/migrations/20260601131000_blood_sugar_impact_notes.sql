-- Add optional private notes; impact may be omitted when notes are present.

alter table public.rating_personal_health
  add column if not exists notes text;

alter table public.rating_personal_health
  alter column impact drop not null;

alter table public.rating_personal_health
  drop constraint if exists rating_personal_health_impact_check;

alter table public.rating_personal_health
  add constraint rating_personal_health_impact_check
    check (impact is null or impact in ('low', 'medium', 'high'));

alter table public.rating_personal_health
  drop constraint if exists rating_personal_health_has_content_check;

alter table public.rating_personal_health
  add constraint rating_personal_health_has_content_check
    check (
      impact is not null
      or (notes is not null and length(trim(notes)) > 0)
    );
