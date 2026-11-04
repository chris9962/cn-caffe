-- Closing a month deletes its check in and check out photos to save storage; the shift keeps when that happened.
alter table public.shifts add column photos_deleted_at timestamptz;

-- A closed month's shifts stay locked, except for the one update clear_month_shift_photos makes.
create or replace function private.lock_shift_month()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and new.check_in_photo_path is null
    and new.check_out_photo_path is null
    and new.photos_deleted_at is not null
    and (to_jsonb(new) - array['check_in_photo_path', 'check_out_photo_path', 'photos_deleted_at'])
      = (to_jsonb(old) - array['check_in_photo_path', 'check_out_photo_path', 'photos_deleted_at'])
  then
    return new;
  end if;
  if tg_op <> 'INSERT' then
    perform private.assert_month_open(old.work_date);
  end if;
  if tg_op <> 'DELETE' then
    perform private.assert_month_open(new.work_date);
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- Unlinks the photos of a closed month and returns their paths, so the route handler can remove the files.
create function public.clear_month_shift_photos(p_month date)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_end date := (p_month + interval '1 month')::date;
  v_paths text[];
begin
  if not private.is_admin() then
    raise exception using message = 'forbidden', errcode = '42501';
  end if;
  if not exists (select 1 from public.payroll_periods where month = p_month and status = 'closed') then
    raise exception using message = 'month_not_closed', errcode = 'P0001';
  end if;

  select coalesce(array_agg(path), '{}') into v_paths
  from public.shifts as s
  cross join lateral unnest(array[s.check_in_photo_path, s.check_out_photo_path]) as path
  where s.work_date >= p_month and s.work_date < v_end and path is not null;

  update public.shifts
  set check_in_photo_path = null, check_out_photo_path = null, photos_deleted_at = now()
  where work_date >= p_month and work_date < v_end
    and (check_in_photo_path is not null or check_out_photo_path is not null);

  insert into public.audit_logs (actor_id, action, table_name, row_id, before, after)
  values (
    auth.uid(), 'shift_photos.deleted', 'payroll_periods', p_month::text, null,
    jsonb_build_object('photos', cardinality(v_paths))
  );

  return v_paths;
end;
$$;

revoke execute on function public.clear_month_shift_photos(date) from public, anon;
grant execute on function public.clear_month_shift_photos(date) to authenticated;

-- Storage deletes with RETURNING, so admins need to see an unlinked photo as well as delete it.
drop policy "shift photos: read via shift or own unreferenced upload" on storage.objects;

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
      ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_admin()))
      and not exists (select 1 from public.shifts s where s.check_in_photo_path = name or s.check_out_photo_path = name)
    )
  )
);

create policy "shift photos: admins delete unreferenced photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'shift-photos'
  and (select private.is_admin())
  and not exists (select 1 from public.shifts s where s.check_in_photo_path = name or s.check_out_photo_path = name)
);
