create or replace function public.edit_shift_times(p_shift_id uuid, p_check_in_at timestamptz, p_check_out_at timestamptz)
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

  if p_check_out_at > now() then
    raise exception using message = 'future_times', errcode = 'P0001';
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

create or replace function public.add_manual_shift(
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

  if p_check_out_at > now() then
    raise exception using message = 'future_times', errcode = 'P0001';
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
