create type public.payroll_status as enum ('open', 'closing', 'closed');

-- The employment type lives on each rate, so a switch from part time to full time mid-month splits the month correctly.
create table public.pay_rates (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees,
  employment_type public.employment_type not null,
  amount integer not null check (amount > 0),
  effective_from date not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (employee_id, effective_from)
);

create table public.pay_adjustments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees,
  month date not null check (extract(day from month) = 1),
  amount integer not null check (amount <> 0),
  note text not null check (btrim(note) <> ''),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index pay_adjustments_month_idx on public.pay_adjustments (month, employee_id);

create table public.payroll_periods (
  month date primary key check (extract(day from month) = 1),
  status public.payroll_status not null default 'open',
  current_version integer
);

create table public.payroll_versions (
  id uuid primary key default gen_random_uuid(),
  month date not null references public.payroll_periods,
  version integer not null,
  closed_by uuid,
  closed_at timestamptz not null default now(),
  reopened_by uuid,
  reopened_at timestamptz,
  reopen_reason text,
  unique (month, version)
);

create table public.payslips (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.payroll_versions on delete cascade,
  employee_id uuid not null references public.employees,
  total bigint not null,
  data jsonb not null,
  unique (version_id, employee_id)
);

create index payslips_employee_id_idx on public.payslips (employee_id);

-- FOR SHARE waits for a close that is taking the period lock, so a write cannot slip in between its check and its commit.
create function private.assert_month_open(p_date date)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_date is null then
    return;
  end if;
  perform 1 from public.payroll_periods
  where month = date_trunc('month', p_date)::date and status <> 'open'
  for share;
  if found then
    raise exception using message = 'month_closed', errcode = 'P0001';
  end if;
end;
$$;

create function private.lock_shift_month()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op <> 'INSERT' then
    perform private.assert_month_open(old.work_date);
  end if;
  if tg_op <> 'DELETE' then
    perform private.assert_month_open(new.work_date);
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger shifts_lock_closed_month
before insert or update or delete on public.shifts
for each row execute function private.lock_shift_month();

create function private.lock_month_column()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op <> 'INSERT' then
    perform private.assert_month_open(old.month);
  end if;
  if tg_op <> 'DELETE' then
    perform private.assert_month_open(new.month);
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- Inserting a missing month config stays allowed: config_for_month creates one on first use.
create trigger monthly_configs_lock_closed_month
before update or delete on public.monthly_configs
for each row execute function private.lock_month_column();

create trigger pay_adjustments_lock_closed_month
before insert or update or delete on public.pay_adjustments
for each row execute function private.lock_month_column();

-- tg_argv: action prefix, then the column that identifies the row.
create function private.audit_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.audit_logs (actor_id, action, table_name, row_id, before, after)
  values (
    auth.uid(),
    tg_argv[0] || case tg_op when 'INSERT' then '.created' when 'UPDATE' then '.updated' else '.deleted' end,
    tg_table_name,
    v_row ->> tg_argv[1],
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return null;
end;
$$;

create trigger pay_rates_audit
after insert or delete on public.pay_rates
for each row execute function private.audit_change('pay_rate', 'employee_id');

create trigger pay_adjustments_audit
after insert or delete on public.pay_adjustments
for each row execute function private.audit_change('pay_adjustment', 'employee_id');

create trigger monthly_configs_audit
after update on public.monthly_configs
for each row execute function private.audit_change('monthly_config', 'month');

revoke execute on function private.assert_month_open(date) from public, anon, authenticated;
revoke execute on function private.lock_shift_month() from public, anon, authenticated;
revoke execute on function private.lock_month_column() from public, anon, authenticated;
revoke execute on function private.audit_change() from public, anon, authenticated;

create function private.is_current_payslip_version(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.payroll_versions as v
    join public.payroll_periods as p on p.month = v.month
    where v.id = p_version_id and p.status = 'closed' and p.current_version = v.version
  );
$$;

revoke execute on function private.is_current_payslip_version(uuid) from public, anon;
grant execute on function private.is_current_payslip_version(uuid) to authenticated;

-- Any active employee may read a month's config; a missing month is copied from the latest earlier one.
create function public.get_monthly_config(p_month date)
returns public.monthly_configs
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.current_employee_role() is null then
    raise exception using message = 'forbidden', errcode = '42501';
  end if;
  if extract(day from p_month) <> 1 then
    raise exception using message = 'invalid_month', errcode = 'P0001';
  end if;
  return private.config_for_month(p_month);
end;
$$;

revoke execute on function public.get_monthly_config(date) from public, anon;
grant execute on function public.get_monthly_config(date) to authenticated;

-- Step 1 of closing: lock the month so shifts, config and adjustments stop changing while the server computes payslips.
create function public.start_payroll_close(p_month date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.payroll_status;
begin
  if not private.is_admin() then
    raise exception using message = 'forbidden', errcode = '42501';
  end if;
  if extract(day from p_month) <> 1 then
    raise exception using message = 'invalid_month', errcode = 'P0001';
  end if;
  if (p_month + interval '1 month')::date > (now() at time zone 'Asia/Ho_Chi_Minh')::date then
    raise exception using message = 'month_not_ended', errcode = 'P0001';
  end if;

  insert into public.payroll_periods (month) values (p_month) on conflict (month) do nothing;
  select status into v_status from public.payroll_periods where month = p_month for update;
  if v_status = 'closed' then
    raise exception using message = 'month_closed', errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.shifts
    where work_date >= p_month
      and work_date < (p_month + interval '1 month')::date
      and status in ('open', 'missing_checkout', 'pending_review')
  ) then
    raise exception using message = 'blocking_shifts', errcode = 'P0001';
  end if;

  update public.payroll_periods set status = 'closing' where month = p_month;
end;
$$;

-- Step 2 of closing: store the payslips the server computed and mark the month closed, in one transaction.
create function public.finish_payroll_close(p_month date, p_payslips jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.payroll_status;
  v_version integer;
  v_version_id uuid;
begin
  if not private.is_admin() then
    raise exception using message = 'forbidden', errcode = '42501';
  end if;

  select status into v_status from public.payroll_periods where month = p_month for update;
  if v_status is distinct from 'closing' then
    raise exception using message = 'not_closing', errcode = 'P0001';
  end if;

  select coalesce(max(version), 0) + 1 into v_version from public.payroll_versions where month = p_month;

  insert into public.payroll_versions (month, version, closed_by)
  values (p_month, v_version, auth.uid())
  returning id into v_version_id;

  insert into public.payslips (version_id, employee_id, total, data)
  select v_version_id, (item ->> 'employeeId')::uuid, (item ->> 'total')::bigint, item -> 'data'
  from jsonb_array_elements(p_payslips) as item;

  update public.payroll_periods set status = 'closed', current_version = v_version where month = p_month;

  insert into public.audit_logs (actor_id, action, table_name, row_id, before, after)
  values (
    auth.uid(), 'payroll.closed', 'payroll_periods', p_month::text, null,
    jsonb_build_object('version', v_version, 'payslips', jsonb_array_length(p_payslips))
  );

  return v_version;
end;
$$;

-- Releases the lock when the server could not finish a close.
create function public.cancel_payroll_close(p_month date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception using message = 'forbidden', errcode = '42501';
  end if;
  update public.payroll_periods set status = 'open' where month = p_month and status = 'closing';
end;
$$;

create function public.reopen_payroll_month(p_month date, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_period public.payroll_periods;
begin
  if not private.is_admin() then
    raise exception using message = 'forbidden', errcode = '42501';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception using message = 'reason_required', errcode = 'P0001';
  end if;

  select * into v_period from public.payroll_periods where month = p_month for update;
  if v_period.status is distinct from 'closed' then
    raise exception using message = 'month_not_closed', errcode = 'P0001';
  end if;

  -- The closed version and its payslips stay as they are; they are the record from before the reopen.
  update public.payroll_versions
  set reopened_by = auth.uid(), reopened_at = now(), reopen_reason = btrim(p_reason)
  where month = p_month and version = v_period.current_version;

  update public.payroll_periods set status = 'open' where month = p_month;

  insert into public.audit_logs (actor_id, action, table_name, row_id, before, after)
  values (
    auth.uid(), 'payroll.reopened', 'payroll_periods', p_month::text,
    jsonb_build_object('version', v_period.current_version),
    jsonb_build_object('reason', btrim(p_reason))
  );
end;
$$;

revoke execute on function public.start_payroll_close(date) from public, anon;
revoke execute on function public.finish_payroll_close(date, jsonb) from public, anon;
revoke execute on function public.cancel_payroll_close(date) from public, anon;
revoke execute on function public.reopen_payroll_month(date, text) from public, anon;
grant execute on function public.start_payroll_close(date) to authenticated;
grant execute on function public.finish_payroll_close(date, jsonb) to authenticated;
grant execute on function public.cancel_payroll_close(date) to authenticated;
grant execute on function public.reopen_payroll_month(date, text) to authenticated;

revoke all on public.pay_rates from anon, authenticated;
grant select, insert, delete on public.pay_rates to authenticated;
alter table public.pay_rates enable row level security;

create policy "pay rates readable by admins and the employee"
on public.pay_rates
for select
to authenticated
using ((select private.is_admin()) or (employee_id = (select auth.uid()) and (select private.current_employee_role()) is not null));

create policy "admins insert pay rates"
on public.pay_rates
for insert
to authenticated
with check ((select private.is_admin()));

create policy "admins delete pay rates"
on public.pay_rates
for delete
to authenticated
using ((select private.is_admin()));

revoke all on public.pay_adjustments from anon, authenticated;
grant select, insert, delete on public.pay_adjustments to authenticated;
alter table public.pay_adjustments enable row level security;

create policy "pay adjustments readable by admins and the employee"
on public.pay_adjustments
for select
to authenticated
using ((select private.is_admin()) or (employee_id = (select auth.uid()) and (select private.current_employee_role()) is not null));

create policy "admins insert pay adjustments"
on public.pay_adjustments
for insert
to authenticated
with check ((select private.is_admin()));

create policy "admins delete pay adjustments"
on public.pay_adjustments
for delete
to authenticated
using ((select private.is_admin()));

revoke all on public.payroll_periods from anon, authenticated;
grant select on public.payroll_periods to authenticated;
alter table public.payroll_periods enable row level security;

create policy "payroll periods readable by active employees"
on public.payroll_periods
for select
to authenticated
using ((select private.current_employee_role()) is not null);

revoke all on public.payroll_versions from anon, authenticated;
grant select on public.payroll_versions to authenticated;
alter table public.payroll_versions enable row level security;

create policy "payroll versions readable by admins"
on public.payroll_versions
for select
to authenticated
using ((select private.is_admin()));

revoke all on public.payslips from anon, authenticated;
grant select on public.payslips to authenticated;
alter table public.payslips enable row level security;

-- Employees see only their payslip of the latest version of a month that is closed right now.
create policy "payslips readable by admins and the employee"
on public.payslips
for select
to authenticated
using (
  (select private.is_admin())
  or (
    employee_id = (select auth.uid())
    and (select private.current_employee_role()) is not null
    and private.is_current_payslip_version(version_id)
  )
);
