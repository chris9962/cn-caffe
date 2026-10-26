begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'a@test.local'),
  ('00000000-0000-0000-0000-000000000002', 'd@test.local'),
  ('00000000-0000-0000-0000-000000000003', 'm@test.local'),
  ('00000000-0000-0000-0000-000000000004', 's@test.local'),
  ('00000000-0000-0000-0000-000000000005', 'x@test.local');

insert into public.employees (id, full_name, phone, role, is_active, requires_attendance) values
  ('00000000-0000-0000-0000-000000000001', 'Admin A', '84000000001', 'admin', true, false),
  ('00000000-0000-0000-0000-000000000002', 'Director D', '84000000002', 'director', true, false),
  ('00000000-0000-0000-0000-000000000003', 'Manager M', '84000000003', 'manager', true, true),
  ('00000000-0000-0000-0000-000000000004', 'Staff S', '84000000004', 'staff', true, true),
  ('00000000-0000-0000-0000-000000000005', 'Inactive X', '84000000005', 'staff', false, true);

insert into public.branches (id, name, latitude, longitude, is_active) values
  ('00000000-0000-0000-0000-0000000000b1', 'B1', 10.77, 106.70, true),
  ('00000000-0000-0000-0000-0000000000b2', 'B2', 10.78, 106.71, true),
  ('00000000-0000-0000-0000-0000000000b3', 'B3', 10.79, 106.72, false);

-- M starts with B1 + shifts.view so the test proves set_manager_access replaces rather than appends.
insert into public.manager_branches (manager_id, branch_id) values
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000b1');
insert into public.manager_permissions (manager_id, permission) values
  ('00000000-0000-0000-0000-000000000003', 'shifts.view');

-- Staff S
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000004', 'role', 'authenticated')::text, true);

select is((select count(*) from public.employees), 1::bigint, 'staff sees only their own employee row');
-- Totals count only fixture rows, so accounts and branches already in the local database don't change them.
select is((select count(*) from public.branches where id::text like '00000000-0000-0000-0000-%'), 2::bigint, 'staff sees only active branches');
select throws_ok(
  $$insert into public.branches (name, latitude, longitude) values ('B4', 10.8, 106.8)$$,
  '42501', null, 'staff cannot insert branches'
);
reset role;

-- Manager M
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000003', 'role', 'authenticated')::text, true);

select is((select count(*) from public.employees where id::text like '00000000-0000-0000-0000-%'), 5::bigint, 'manager sees all employees');
reset role;

-- Admin A
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

select is((select count(*) from public.branches where id::text like '00000000-0000-0000-0000-%'), 3::bigint, 'admin sees all branches, including inactive');
reset role;

-- Inactive X
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000005', 'role', 'authenticated')::text, true);

select is((select count(*) from public.employees), 0::bigint, 'inactive employee sees no employee rows');
select is(private.current_employee_role(), null, 'inactive employee has no current role');
reset role;

-- Anon
set local role anon;
select throws_ok('select * from public.employees', '42501', null, 'anon cannot read employees');
reset role;

-- Admin A sets manager access
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

select lives_ok(
  $$select public.set_manager_access(
    '00000000-0000-0000-0000-000000000003',
    array['00000000-0000-0000-0000-0000000000b2']::uuid[],
    array['shifts.review']::public.manager_permission[]
  )$$,
  'admin can set manager access'
);
select is(
  (select array_agg(branch_id) from public.manager_branches where manager_id = '00000000-0000-0000-0000-000000000003'),
  array['00000000-0000-0000-0000-0000000000b2']::uuid[],
  'manager branches are replaced'
);
select is(
  (select array_agg(permission) from public.manager_permissions where manager_id = '00000000-0000-0000-0000-000000000003'),
  array['shifts.review']::public.manager_permission[],
  'manager permissions are replaced'
);
select is(
  (select count(*) from public.audit_logs where action = 'manager_access.set' and row_id = '00000000-0000-0000-0000-000000000003'),
  1::bigint,
  'set_manager_access writes one audit row'
);
select is(
  (select jsonb_build_object('actor_id', actor_id, 'table_name', table_name, 'row_id', row_id, 'before', before, 'after', after)
     from public.audit_logs where action = 'manager_access.set' and row_id = '00000000-0000-0000-0000-000000000003'),
  jsonb_build_object(
    'actor_id', '00000000-0000-0000-0000-000000000001',
    'table_name', 'employees',
    'row_id', '00000000-0000-0000-0000-000000000003',
    'before', '{"branch_ids": ["00000000-0000-0000-0000-0000000000b1"], "permissions": ["shifts.view"]}'::jsonb,
    'after', '{"branch_ids": ["00000000-0000-0000-0000-0000000000b2"], "permissions": ["shifts.review"]}'::jsonb
  ),
  'audit row records actor, target and before/after access'
);
select ok(
  private.has_branch_permission('00000000-0000-0000-0000-0000000000b1', 'shifts.edit'),
  'admin has every permission on every branch'
);
select throws_ok(
  $$select public.set_manager_access(
    '00000000-0000-0000-0000-000000000004',
    array['00000000-0000-0000-0000-0000000000b2']::uuid[],
    array['shifts.review']::public.manager_permission[]
  )$$,
  'P0001', 'not_a_manager', 'set_manager_access rejects a target who is not a manager'
);
reset role;

-- Manager M after the change
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000003', 'role', 'authenticated')::text, true);

select ok(
  private.has_branch_permission('00000000-0000-0000-0000-0000000000b2', 'shifts.review'),
  'manager has the granted permission on the assigned branch'
);
select ok(
  not private.has_branch_permission('00000000-0000-0000-0000-0000000000b1', 'shifts.review'),
  'manager lost the removed branch'
);
select ok(
  not private.has_branch_permission('00000000-0000-0000-0000-0000000000b2', 'shifts.view'),
  'manager lost the removed permission'
);
reset role;

-- Staff S
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000004', 'role', 'authenticated')::text, true);

select throws_ok(
  $$select public.set_manager_access(
    '00000000-0000-0000-0000-000000000003',
    array['00000000-0000-0000-0000-0000000000b1']::uuid[],
    array['shifts.edit']::public.manager_permission[]
  )$$,
  '42501', null, 'staff cannot set manager access'
);
select lives_ok('select public.mark_password_changed()', 'staff can mark their password changed');
reset role;

select is(
  (select must_change_password from public.employees where id = '00000000-0000-0000-0000-000000000004'),
  false,
  'mark_password_changed clears must_change_password for the caller'
);

select * from finish();
rollback;
