begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'pa@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'pm@test.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'ps@test.local'),
  ('00000000-0000-0000-0000-0000000000a4', 'pt@test.local');

insert into public.employees (id, full_name, phone, role, requires_attendance) values
  ('00000000-0000-0000-0000-0000000000a1', 'Admin', '84100000001', 'admin', false),
  ('00000000-0000-0000-0000-0000000000a2', 'Manager', '84100000002', 'manager', true),
  ('00000000-0000-0000-0000-0000000000a3', 'Staff S', '84100000003', 'staff', true),
  ('00000000-0000-0000-0000-0000000000a4', 'Staff T', '84100000004', 'staff', true);

insert into public.pay_rates (employee_id, employment_type, amount, effective_from) values
  ('00000000-0000-0000-0000-0000000000a3', 'part_time', 25000, '2024-01-01'),
  ('00000000-0000-0000-0000-0000000000a4', 'part_time', 26000, '2024-01-01');

insert into public.pay_adjustments (employee_id, month, amount, note) values
  ('00000000-0000-0000-0000-0000000000a3', '2024-05-01', 1000, 'Thưởng'),
  ('00000000-0000-0000-0000-0000000000a4', '2024-05-01', 2000, 'Thưởng');

-- Two closed versions of May 2024: staff may see only their own row of the current one.
insert into public.payroll_periods (month, status, current_version) values ('2024-05-01', 'closed', 2);
insert into public.payroll_versions (id, month, version) values
  ('00000000-0000-0000-0000-0000000000f1', '2024-05-01', 1),
  ('00000000-0000-0000-0000-0000000000f2', '2024-05-01', 2);
insert into public.payslips (version_id, employee_id, total, data) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a3', 1, '{}'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a3', 2, '{}'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a4', 3, '{}');

-- Staff S
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a3', 'role', 'authenticated')::text, true);

select results_eq('select amount from public.pay_rates', array[25000], 'staff read only their own pay rates');
select results_eq('select amount from public.pay_adjustments', array[1000], 'staff read only their own adjustments');
select results_eq('select total from public.payslips', array[2::bigint], 'staff read only their payslip of the current version');
select is_empty('select 1 from public.payroll_versions', 'staff cannot read payroll versions');
select throws_ok(
  $$insert into public.pay_rates (employee_id, employment_type, amount, effective_from)
    values ('00000000-0000-0000-0000-0000000000a3', 'part_time', 99999, '2024-06-01')$$,
  '42501', null, 'staff cannot add pay rates'
);
select throws_ok($$select public.start_payroll_close('2024-04-01')$$, '42501', 'forbidden', 'staff cannot close a month');
reset role;

-- Manager: shift permissions never include pay.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a2', 'role', 'authenticated')::text, true);

select is_empty('select 1 from public.pay_rates', 'managers cannot read other people''s pay rates');
select is_empty('select 1 from public.payslips', 'managers cannot read other people''s payslips');
reset role;

-- Admin
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a1', 'role', 'authenticated')::text, true);

select results_eq(
  $$select count(*)::int from public.payslips
    where version_id in ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2')$$,
  array[3],
  'admins read every payslip of every version'
);
select throws_ok(
  $$insert into public.pay_adjustments (employee_id, month, amount, note)
    values ('00000000-0000-0000-0000-0000000000a3', '2024-05-01', 5, 'Muộn')$$,
  'P0001', 'month_closed', 'a closed month refuses new adjustments'
);
select throws_ok(
  $$delete from public.pay_adjustments where month = '2024-05-01'$$,
  'P0001', 'month_closed', 'a closed month refuses deleting adjustments'
);
select throws_ok($$select public.reopen_payroll_month('2024-05-01', '  ')$$, 'P0001', 'reason_required', 'reopening needs a reason');
select lives_ok($$select public.reopen_payroll_month('2024-05-01', 'Sửa thưởng')$$, 'an admin reopens a closed month');
select results_eq(
  $$select reopen_reason from public.payroll_versions where version = 2$$,
  array['Sửa thưởng'],
  'the reopened version keeps the reason'
);
reset role;

-- After the reopen the staff member no longer sees a stored payslip for May.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a3', 'role', 'authenticated')::text, true);
select is_empty('select 1 from public.payslips', 'a reopened month hides its payslips from staff');
reset role;

select results_eq(
  $$select action from public.audit_logs where row_id = '2024-05-01' order by id$$,
  array['payroll.reopened'],
  'reopening is written to the audit log'
);

select * from finish();
rollback;
