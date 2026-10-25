begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

-- storage.protect_delete blocks raw deletes unless this flag is set; the Storage API sets it itself.
set local storage.allow_delete_query = 'true';

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000003', 'n@test.local'),
  ('00000000-0000-0000-0000-000000000004', 's@test.local'),
  ('00000000-0000-0000-0000-000000000005', 't@test.local');

insert into public.employees (id, full_name, phone, role) values
  ('00000000-0000-0000-0000-000000000003', 'Manager N', '84900000003', 'manager'),
  ('00000000-0000-0000-0000-000000000004', 'Staff S', '84900000004', 'staff'),
  ('00000000-0000-0000-0000-000000000005', 'Staff T', '84900000005', 'staff');

insert into public.branches (id, name, latitude, longitude, radius_m, is_active) values
  ('00000000-0000-0000-0000-0000000000b1', 'B1', 10.7769, 106.7009, 100, true);
insert into public.manager_branches (manager_id, branch_id) values
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000b1');
insert into public.manager_permissions (manager_id, permission) values
  ('00000000-0000-0000-0000-000000000003', 'shifts.view');

select is(
  (select jsonb_build_object('public', public, 'limit', file_size_limit, 'mime', allowed_mime_types) from storage.buckets where id = 'shift-photos'),
  jsonb_build_object('public', false, 'limit', 2097152, 'mime', jsonb_build_array('image/jpeg')),
  'shift-photos is a private bucket limited to 2 MB JPEG'
);

-- Staff S: upload
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000004', 'role', 'authenticated')::text, true);

select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('shift-photos', '00000000-0000-0000-0000-000000000004/x.jpg')$$,
  'staff uploads into own folder'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('shift-photos', '00000000-0000-0000-0000-000000000005/x.jpg')$$,
  '42501', null, 'staff cannot upload into another folder'
);
select is(
  (select count(*) from storage.objects where name = '00000000-0000-0000-0000-000000000004/x.jpg'),
  1::bigint,
  'staff reads own unreferenced object'
);
reset role;

-- Staff T
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000005', 'role', 'authenticated')::text, true);

select is(
  (select count(*) from storage.objects where name = '00000000-0000-0000-0000-000000000004/x.jpg'),
  0::bigint,
  'another staff cannot read an unreferenced object'
);
reset role;

insert into public.shifts (employee_id, branch_id, work_date, status, source, check_in_at, check_in_photo_path, created_by)
values ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000b1',
  ((now() - interval '1 hour') at time zone 'Asia/Ho_Chi_Minh')::date, 'open', 'check_in', now() - interval '1 hour',
  '00000000-0000-0000-0000-000000000004/x.jpg', '00000000-0000-0000-0000-000000000004');

-- Staff S: referenced object
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000004', 'role', 'authenticated')::text, true);

select is(
  (select count(*) from storage.objects where name = '00000000-0000-0000-0000-000000000004/x.jpg'),
  1::bigint,
  'staff reads a referenced object of own shift'
);
select lives_ok(
  $$delete from storage.objects where name = '00000000-0000-0000-0000-000000000004/x.jpg'$$,
  'staff delete of a referenced object runs'
);
reset role;

select is(
  (select count(*) from storage.objects where name = '00000000-0000-0000-0000-000000000004/x.jpg'),
  1::bigint,
  'staff delete of a referenced object removes nothing'
);

-- Manager N (shifts.view on B1)
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000003', 'role', 'authenticated')::text, true);

select is(
  (select count(*) from storage.objects where name = '00000000-0000-0000-0000-000000000004/x.jpg'),
  1::bigint,
  'manager with shifts.view reads a referenced object'
);
reset role;

-- Staff T
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000005', 'role', 'authenticated')::text, true);

select is(
  (select count(*) from storage.objects where name = '00000000-0000-0000-0000-000000000004/x.jpg'),
  0::bigint,
  'another staff cannot read a referenced object'
);
reset role;

-- Staff S: cleanup of an unreferenced upload
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000004', 'role', 'authenticated')::text, true);

insert into storage.objects (bucket_id, name) values ('shift-photos', '00000000-0000-0000-0000-000000000004/y.jpg');
select lives_ok(
  $$delete from storage.objects where name = '00000000-0000-0000-0000-000000000004/y.jpg'$$,
  'staff deletes an unreferenced object of own folder'
);
reset role;

select is(
  (select count(*) from storage.objects where name = '00000000-0000-0000-0000-000000000004/y.jpg'),
  0::bigint,
  'the unreferenced object is gone'
);

-- Photo path constraint
select throws_ok(
  $$insert into public.shifts (employee_id, branch_id, work_date, status, source, check_in_at, check_in_photo_path, created_by)
    values ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000b1', current_date, 'open', 'check_in', now(), '00000000-0000-0000-0000-000000000004/x.jpg', '00000000-0000-0000-0000-000000000005')$$,
  '23514', null, 'a shift cannot reference a photo in another employee folder'
);
select throws_ok(
  $$insert into public.shifts (employee_id, branch_id, work_date, status, source, check_in_at, check_out_photo_path, created_by)
    values ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000b1', current_date, 'open', 'check_in', now(), '00000000-0000-0000-0000-000000000004/x.jpg', '00000000-0000-0000-0000-000000000005')$$,
  '23514', null, 'a check out photo in another employee folder is refused'
);
select throws_ok(
  $$insert into public.shifts (employee_id, branch_id, work_date, status, source, check_in_at, check_in_photo_path, created_by)
    values ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000b1', current_date, 'open', 'check_in', now(), '00000000-0000-0000-0000-000000000005/../x.jpg', '00000000-0000-0000-0000-000000000005')$$,
  '23514', null, 'a photo path with parent traversal is refused'
);
select throws_ok(
  $$insert into public.shifts (employee_id, branch_id, work_date, status, source, check_in_at, check_in_photo_path, created_by)
    values ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000b1', current_date, 'open', 'check_in', now(), '00000000-0000-0000-0000-000000000005/a/b.jpg', '00000000-0000-0000-0000-000000000005')$$,
  '23514', null, 'a nested photo path is refused'
);
select lives_ok(
  $$insert into public.shifts (employee_id, branch_id, work_date, status, source, check_in_at, check_in_photo_path, created_by)
    values ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000b1', current_date, 'open', 'check_in', now(), '00000000-0000-0000-0000-000000000005/x.jpg', '00000000-0000-0000-0000-000000000005')$$,
  'a photo path in the employee own folder is accepted'
);

select * from finish();
rollback;
