create type public.employment_type as enum ('full_time', 'part_time');

alter table public.employees
  add column employment_type public.employment_type not null default 'part_time',
  add column requires_attendance boolean not null default true;

update public.employees
set requires_attendance = false
where role in ('admin', 'director');

alter table public.employees
  add constraint employees_admin_director_no_attendance
  check (role not in ('admin', 'director') or not requires_attendance);

create function private.enforce_shift_attendance_required()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.employees
    where id = new.employee_id
      and is_active
      and requires_attendance
  ) then
    raise exception using message = 'attendance_not_required', errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function private.enforce_shift_attendance_required() from public, anon, authenticated;

create trigger shifts_require_attendance_employee
before insert or update of employee_id on public.shifts
for each row execute function private.enforce_shift_attendance_required();
