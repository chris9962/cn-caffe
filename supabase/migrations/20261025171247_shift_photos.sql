insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shift-photos', 'shift-photos', false, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

create policy "shift photos: upload to own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'shift-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- The exists() subquery runs under the caller's shifts RLS, so viewers see exactly the photos of shifts they can see.
create policy "shift photos: read via shift or own unreferenced upload"
on storage.objects for select to authenticated
using (
  bucket_id = 'shift-photos'
  and (
    exists (
      select 1 from public.shifts s
      where s.check_in_photo_path = name or s.check_out_photo_path = name
    )
    or (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and not exists (select 1 from public.shifts s where s.check_in_photo_path = name or s.check_out_photo_path = name)
    )
  )
);

-- Referenced photos are evidence, so only an upload that no shift uses (e.g. after a failed check in) can be removed.
create policy "shift photos: delete own unreferenced upload"
on storage.objects for delete to authenticated
using (
  bucket_id = 'shift-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and not exists (select 1 from public.shifts s where s.check_in_photo_path = name or s.check_out_photo_path = name)
);
