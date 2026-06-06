-- Meal photo uploads failed for signed-in users when only an implicit/anon
-- insert policy existed on storage.objects. Grant INSERT explicitly for
-- both roles (path is device-scoped, not user-scoped — no auth.uid() check).

drop policy if exists "Anonymous upload meal photos" on storage.objects;
drop policy if exists "Authenticated upload meal photos" on storage.objects;

create policy "Anonymous upload meal photos"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'meal-photos');

create policy "Authenticated upload meal photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'meal-photos');
