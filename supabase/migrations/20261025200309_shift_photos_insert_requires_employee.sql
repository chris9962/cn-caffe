drop policy "shift photos: upload to own folder" on storage.objects;

create policy "shift photos: upload to own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'shift-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select private.current_employee_role()) is not null
);
