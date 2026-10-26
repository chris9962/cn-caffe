create type public.shift_status as enum ('open', 'missing_checkout', 'pending_review', 'valid', 'rejected');
create type public.shift_source as enum ('check_in', 'manual');

create table public.monthly_configs (
  month date primary key check (extract(day from month) = 1),
  overtime_start time not null default '23:00',
  overtime_end time not null default '06:00',
  overtime_hourly_rate integer not null default 0 check (overtime_hourly_rate >= 0),
  max_shift_minutes integer not null default 960 check (max_shift_minutes > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees,
  branch_id uuid not null references public.branches,
  work_date date not null,
  status public.shift_status not null,
  source public.shift_source not null,
  check_in_at timestamptz not null,
  check_in_latitude double precision,
  check_in_longitude double precision,
  check_in_accuracy_m double precision,
  check_in_distance_m double precision,
  check_in_photo_path text,
  check_out_at timestamptz,
  check_out_latitude double precision,
  check_out_longitude double precision,
  check_out_accuracy_m double precision,
  check_out_distance_m double precision,
  check_out_photo_path text,
  fail_reasons text[] not null default '{}'
    check (fail_reasons <@ array['outside_radius', 'location_unavailable', 'too_long']),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  check (check_out_at is null or check_out_at > check_in_at)
);

create unique index shifts_one_open_per_employee on public.shifts (employee_id) where status = 'open';
create index shifts_branch_id_work_date_idx on public.shifts (branch_id, work_date);
create index shifts_employee_id_work_date_idx on public.shifts (employee_id, work_date);

-- least() stops rounding from pushing the asin argument above 1 for near-antipodal points.
create function private.distance_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 2 * 6371000 * asin(least(1, sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  )));
$$;

create function private.config_for_month(p_month date)
returns public.monthly_configs
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_config public.monthly_configs;
begin
  select * into v_config from public.monthly_configs where month = p_month;
  if found then
    return v_config;
  end if;

  -- on conflict covers two transactions creating the same month at once.
  insert into public.monthly_configs (month, overtime_start, overtime_end, overtime_hourly_rate, max_shift_minutes)
  select p_month, overtime_start, overtime_end, overtime_hourly_rate, max_shift_minutes
  from public.monthly_configs
  where month < p_month
  order by month desc
  limit 1
  on conflict (month) do nothing;

  insert into public.monthly_configs (month) values (p_month)
  on conflict (month) do nothing;

  select * into v_config from public.monthly_configs where month = p_month;
  return v_config;
end;
$$;

revoke execute on function private.distance_m(double precision, double precision, double precision, double precision) from public, anon;
grant execute on function private.distance_m(double precision, double precision, double precision, double precision) to authenticated;
revoke execute on function private.config_for_month(date) from public, anon;

create function public.branches_by_distance(p_latitude double precision, p_longitude double precision)
returns table (
  id uuid,
  name text,
  address text,
  google_maps_url text,
  latitude double precision,
  longitude double precision,
  radius_m integer,
  is_active boolean,
  distance_m double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select b.id, b.name, b.address, b.google_maps_url, b.latitude, b.longitude, b.radius_m, b.is_active,
    private.distance_m(p_latitude, p_longitude, b.latitude, b.longitude) as distance_m
  from public.branches as b
  where b.is_active
  order by distance_m;
$$;

revoke execute on function public.branches_by_distance(double precision, double precision) from public, anon;
grant execute on function public.branches_by_distance(double precision, double precision) to authenticated;

create function public.check_in(
  p_branch_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m double precision,
  p_photo_path text,
  p_start_new boolean default false
)
returns public.shifts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_branch public.branches;
  v_open public.shifts;
  v_abandoned public.shifts;
  v_distance double precision;
  v_reasons text[] := '{}';
  v_shift public.shifts;
  v_constraint text;
begin
  if private.current_employee_role() is null then
    raise exception using message = 'forbidden', errcode = '42501';
  end if;

  if not coalesce(starts_with(p_photo_path, auth.uid()::text || '/'), false) then
    raise exception using message = 'invalid_photo', errcode = 'P0001';
  end if;

  select * into v_branch from public.branches where id = p_branch_id and is_active;
  if not found then
    raise exception using message = 'branch_not_found', errcode = 'P0001';
  end if;

  select * into v_open from public.shifts
  where employee_id = auth.uid() and status = 'open'
  for update;
  if found then
    if not coalesce(p_start_new, false) then
      raise exception using message = 'open_shift_exists', errcode = 'P0001';
    end if;

    update public.shifts set status = 'missing_checkout'
    where id = v_open.id
    returning * into v_abandoned;

    insert into public.audit_logs (actor_id, action, table_name, row_id, before, after)
    values (auth.uid(), 'shift.abandoned', 'shifts', v_open.id::text, to_jsonb(v_open), to_jsonb(v_abandoned));
  end if;

  if p_latitude is null or p_longitude is null then
    v_reasons := array['location_unavailable'];
  else
    v_distance := private.distance_m(p_latitude, p_longitude, v_branch.latitude, v_branch.longitude);
    if v_distance > v_branch.radius_m then
      v_reasons := array['outside_radius'];
    end if;
  end if;

  begin
    insert into public.shifts (
      employee_id, branch_id, work_date, status, source, check_in_at,
      check_in_latitude, check_in_longitude, check_in_accuracy_m, check_in_distance_m, check_in_photo_path,
      fail_reasons, created_by
    )
    values (
      auth.uid(), p_branch_id, (now() at time zone 'Asia/Ho_Chi_Minh')::date, 'open', 'check_in', now(),
      p_latitude, p_longitude, p_accuracy_m, v_distance, p_photo_path,
      v_reasons, auth.uid()
    )
    returning * into v_shift;
  exception
    when unique_violation then
      -- A concurrent check in can create the open shift after the lookup above.
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'shifts_one_open_per_employee' then
        raise exception using message = 'open_shift_exists', errcode = 'P0001';
      end if;
      raise;
  end;

  return v_shift;
end;
$$;

revoke execute on function public.check_in(uuid, double precision, double precision, double precision, text, boolean) from public, anon;
grant execute on function public.check_in(uuid, double precision, double precision, double precision, text, boolean) to authenticated;

create function public.check_out(
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m double precision,
  p_photo_path text
)
returns public.shifts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shift public.shifts;
  v_branch public.branches;
  v_distance double precision;
  v_reasons text[];
begin
  if private.current_employee_role() is null then
    raise exception using message = 'forbidden', errcode = '42501';
  end if;

  select * into v_shift from public.shifts
  where employee_id = auth.uid() and status = 'open'
  for update;
  if not found then
    raise exception using message = 'no_open_shift', errcode = 'P0001';
  end if;

  if not coalesce(starts_with(p_photo_path, auth.uid()::text || '/'), false) then
    raise exception using message = 'invalid_photo', errcode = 'P0001';
  end if;

  select * into v_branch from public.branches where id = v_shift.branch_id;
  v_reasons := v_shift.fail_reasons;

  if p_latitude is null or p_longitude is null then
    if not ('location_unavailable' = any(v_reasons)) then
      v_reasons := array_append(v_reasons, 'location_unavailable');
    end if;
  else
    v_distance := private.distance_m(p_latitude, p_longitude, v_branch.latitude, v_branch.longitude);
    if v_distance > v_branch.radius_m and not ('outside_radius' = any(v_reasons)) then
      v_reasons := array_append(v_reasons, 'outside_radius');
    end if;
  end if;

  if extract(epoch from now() - v_shift.check_in_at) / 60
       > (private.config_for_month(date_trunc('month', v_shift.work_date)::date)).max_shift_minutes
     and not ('too_long' = any(v_reasons)) then
    v_reasons := array_append(v_reasons, 'too_long');
  end if;

  update public.shifts set
    status = case when cardinality(v_reasons) = 0 then 'valid' else 'pending_review' end::public.shift_status,
    check_out_at = now(),
    check_out_latitude = p_latitude,
    check_out_longitude = p_longitude,
    check_out_accuracy_m = p_accuracy_m,
    check_out_distance_m = v_distance,
    check_out_photo_path = p_photo_path,
    fail_reasons = v_reasons
  where id = v_shift.id
  returning * into v_shift;

  return v_shift;
end;
$$;

revoke execute on function public.check_out(double precision, double precision, double precision, text) from public, anon;
grant execute on function public.check_out(double precision, double precision, double precision, text) to authenticated;

create function public.review_shift(p_shift_id uuid, p_decision text)
returns public.shifts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.shifts;
  v_after public.shifts;
  v_status public.shift_status;
begin
  select * into v_before from public.shifts where id = p_shift_id for update;
  if not found
     or not private.has_branch_permission(v_before.branch_id, 'shifts.review')
     or (v_before.employee_id = auth.uid() and not private.is_admin()) then
    raise exception using message = 'forbidden', errcode = '42501';
  end if;

  if p_decision = 'approve' then
    if v_before.status <> 'pending_review' or v_before.check_out_at is null then
      raise exception using message = 'invalid_status', errcode = 'P0001';
    end if;
    v_status := 'valid';
  elsif p_decision = 'reject' then
    if v_before.status = 'rejected' then
      raise exception using message = 'invalid_status', errcode = 'P0001';
    end if;
    v_status := 'rejected';
  else
    raise exception using message = 'invalid_decision', errcode = '22023';
  end if;

  update public.shifts
  set status = v_status, reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_shift_id
  returning * into v_after;

  insert into public.audit_logs (actor_id, action, table_name, row_id, before, after)
  values (
    auth.uid(),
    case when v_status = 'valid' then 'shift.approved' else 'shift.rejected' end,
    'shifts', p_shift_id::text, to_jsonb(v_before), to_jsonb(v_after)
  );

  return v_after;
end;
$$;

revoke execute on function public.review_shift(uuid, text) from public, anon;
grant execute on function public.review_shift(uuid, text) to authenticated;

create function public.edit_shift_times(p_shift_id uuid, p_check_in_at timestamptz, p_check_out_at timestamptz)
returns public.shifts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.shifts;
  v_after public.shifts;
  v_work_date date := (p_check_in_at at time zone 'Asia/Ho_Chi_Minh')::date;
  v_reasons text[];
begin
  select * into v_before from public.shifts where id = p_shift_id for update;
  if not found
     or not private.has_branch_permission(v_before.branch_id, 'shifts.edit')
     or (v_before.employee_id = auth.uid() and not private.is_admin()) then
    raise exception using message = 'forbidden', errcode = '42501';
  end if;

  if not coalesce(p_check_out_at > p_check_in_at, false) then
    raise exception using message = 'invalid_times', errcode = 'P0001';
  end if;

  -- Serializes edits and manual shifts of one employee so two overlapping shifts cannot both pass the check.
  perform 1 from public.employees where id = v_before.employee_id for no key update;

  if exists (
    select 1 from public.shifts
    where employee_id = v_before.employee_id
      and id <> p_shift_id
      and status <> 'rejected'
      -- Only an open shift is still running; a shift abandoned without check out counts as its check-in instant.
      and case
        when check_out_at is not null then tstzrange(check_in_at, check_out_at)
        when status = 'open' then tstzrange(check_in_at, null)
        else tstzrange(check_in_at, check_in_at, '[]')
      end && tstzrange(p_check_in_at, p_check_out_at)
  ) then
    raise exception using message = 'overlap', errcode = 'P0001';
  end if;

  v_reasons := v_before.fail_reasons;
  if extract(epoch from p_check_out_at - p_check_in_at) / 60
       > (private.config_for_month(date_trunc('month', v_work_date)::date)).max_shift_minutes
     and not ('too_long' = any(v_reasons)) then
    v_reasons := array_append(v_reasons, 'too_long');
  end if;

  update public.shifts set
    check_in_at = p_check_in_at,
    check_out_at = p_check_out_at,
    work_date = v_work_date,
    fail_reasons = v_reasons,
    status = case
      when status = 'rejected' then 'rejected'
      when cardinality(v_reasons) = 0 then 'valid'
      else 'pending_review'
    end::public.shift_status
  where id = p_shift_id
  returning * into v_after;

  insert into public.audit_logs (actor_id, action, table_name, row_id, before, after)
  values (auth.uid(), 'shift.edited', 'shifts', p_shift_id::text, to_jsonb(v_before), to_jsonb(v_after));

  return v_after;
end;
$$;

revoke execute on function public.edit_shift_times(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.edit_shift_times(uuid, timestamptz, timestamptz) to authenticated;

create function public.add_manual_shift(
  p_employee_id uuid,
  p_branch_id uuid,
  p_check_in_at timestamptz,
  p_check_out_at timestamptz
)
returns public.shifts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shift public.shifts;
  v_work_date date := (p_check_in_at at time zone 'Asia/Ho_Chi_Minh')::date;
  v_reasons text[] := '{}';
begin
  if not private.has_branch_permission(p_branch_id, 'shifts.edit')
     or (p_employee_id = auth.uid() and not private.is_admin()) then
    raise exception using message = 'forbidden', errcode = '42501';
  end if;

  if not coalesce(p_check_out_at > p_check_in_at, false) then
    raise exception using message = 'invalid_times', errcode = 'P0001';
  end if;

  -- Same lock as edit_shift_times, so the overlap check below sees a stable set of shifts.
  perform 1 from public.employees where id = p_employee_id for no key update;

  if exists (
    select 1 from public.shifts
    where employee_id = p_employee_id
      and status <> 'rejected'
      and case
        when check_out_at is not null then tstzrange(check_in_at, check_out_at)
        when status = 'open' then tstzrange(check_in_at, null)
        else tstzrange(check_in_at, check_in_at, '[]')
      end && tstzrange(p_check_in_at, p_check_out_at)
  ) then
    raise exception using message = 'overlap', errcode = 'P0001';
  end if;

  if extract(epoch from p_check_out_at - p_check_in_at) / 60
       > (private.config_for_month(date_trunc('month', v_work_date)::date)).max_shift_minutes then
    v_reasons := array['too_long'];
  end if;

  insert into public.shifts (employee_id, branch_id, work_date, status, source, check_in_at, check_out_at, fail_reasons, created_by)
  values (
    p_employee_id, p_branch_id, v_work_date,
    case when cardinality(v_reasons) = 0 then 'valid' else 'pending_review' end::public.shift_status,
    'manual', p_check_in_at, p_check_out_at, v_reasons, auth.uid()
  )
  returning * into v_shift;

  insert into public.audit_logs (actor_id, action, table_name, row_id, before, after)
  values (auth.uid(), 'shift.created_manually', 'shifts', v_shift.id::text, null, to_jsonb(v_shift));

  return v_shift;
end;
$$;

revoke execute on function public.add_manual_shift(uuid, uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.add_manual_shift(uuid, uuid, timestamptz, timestamptz) to authenticated;

revoke all on public.monthly_configs from anon, authenticated;
grant select, insert, update on public.monthly_configs to authenticated;
alter table public.monthly_configs enable row level security;

create policy "monthly configs readable by active employees"
on public.monthly_configs
for select
to authenticated
using ((select private.current_employee_role()) is not null);

create policy "admins insert monthly configs"
on public.monthly_configs
for insert
to authenticated
with check ((select private.is_admin()));

create policy "admins update monthly configs"
on public.monthly_configs
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

revoke all on public.shifts from anon, authenticated;
grant select on public.shifts to authenticated;
alter table public.shifts enable row level security;

create policy "shifts readable by owner and branch viewers"
on public.shifts
for select
to authenticated
using (
  employee_id = (select auth.uid())
  or private.has_branch_permission(branch_id, 'shifts.view')
);

drop policy "audit logs readable by admins" on public.audit_logs;

-- The exists subquery runs under shifts RLS, so anyone who can see a shift can see its history.
create policy "audit logs readable by admins and shift viewers"
on public.audit_logs
for select
to authenticated
using (
  (select private.is_admin())
  or (
    table_name = 'shifts'
    and exists (select 1 from public.shifts s where s.id::text = row_id)
  )
);
