create type public.employee_role as enum ('admin', 'director', 'manager', 'staff');
create type public.manager_permission as enum ('shifts.view', 'shifts.review', 'shifts.edit');

create table public.employees (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  phone text not null unique,
  role public.employee_role not null default 'staff',
  is_active boolean not null default true,
  end_date date,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  google_maps_url text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  radius_m integer not null default 100 check (radius_m > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.manager_branches (
  manager_id uuid references public.employees,
  branch_id uuid references public.branches,
  primary key (manager_id, branch_id)
);

create table public.manager_permissions (
  manager_id uuid references public.employees,
  permission public.manager_permission,
  primary key (manager_id, permission)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  table_name text not null,
  row_id text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create schema private;
grant usage on schema private to authenticated;

-- SECURITY DEFINER so RLS policies on employees can call these without recursing into themselves.
create function private.current_employee_role()
returns public.employee_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.employees where id = auth.uid() and is_active;
$$;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_employee_role() in ('admin', 'director'), false);
$$;

create function private.has_branch_permission(p_branch_id uuid, p_permission public.manager_permission)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin()
    or (
      coalesce(private.current_employee_role() = 'manager', false)
      and exists (
        select 1 from public.manager_branches
        where manager_id = auth.uid() and branch_id = p_branch_id
      )
      and exists (
        select 1 from public.manager_permissions
        where manager_id = auth.uid() and permission = p_permission
      )
    );
$$;

revoke execute on function private.current_employee_role() from public, anon;
revoke execute on function private.is_admin() from public, anon;
revoke execute on function private.has_branch_permission(uuid, public.manager_permission) from public, anon;
grant execute on function private.current_employee_role() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.has_branch_permission(uuid, public.manager_permission) to authenticated;

create function public.set_manager_access(
  p_manager_id uuid,
  p_branch_ids uuid[],
  p_permissions public.manager_permission[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.employee_role;
  v_before jsonb;
  v_after jsonb;
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Row lock serializes concurrent calls for the same manager so the delete + insert cannot collide.
  select role into v_role from public.employees where id = p_manager_id for update;
  if v_role is distinct from 'manager' then
    raise exception 'not_a_manager' using errcode = 'P0001';
  end if;

  select jsonb_build_object(
    'branch_ids', coalesce((select jsonb_agg(branch_id order by branch_id) from public.manager_branches where manager_id = p_manager_id), '[]'::jsonb),
    'permissions', coalesce((select jsonb_agg(permission order by permission) from public.manager_permissions where manager_id = p_manager_id), '[]'::jsonb)
  ) into v_before;

  delete from public.manager_branches where manager_id = p_manager_id;
  delete from public.manager_permissions where manager_id = p_manager_id;

  insert into public.manager_branches (manager_id, branch_id)
  select distinct p_manager_id, branch_id from unnest(p_branch_ids) as branch_id;

  insert into public.manager_permissions (manager_id, permission)
  select distinct p_manager_id, permission from unnest(p_permissions) as permission;

  select jsonb_build_object(
    'branch_ids', coalesce((select jsonb_agg(branch_id order by branch_id) from public.manager_branches where manager_id = p_manager_id), '[]'::jsonb),
    'permissions', coalesce((select jsonb_agg(permission order by permission) from public.manager_permissions where manager_id = p_manager_id), '[]'::jsonb)
  ) into v_after;

  insert into public.audit_logs (actor_id, action, table_name, row_id, before, after)
  values (auth.uid(), 'manager_access.set', 'employees', p_manager_id::text, v_before, v_after);
end;
$$;

revoke execute on function public.set_manager_access(uuid, uuid[], public.manager_permission[]) from public, anon;
grant execute on function public.set_manager_access(uuid, uuid[], public.manager_permission[]) to authenticated;

create function public.mark_password_changed()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.employees set must_change_password = false where id = auth.uid();
$$;

revoke execute on function public.mark_password_changed() from public, anon;
grant execute on function public.mark_password_changed() to authenticated;

revoke all on public.employees from anon, authenticated;
grant select, insert, update on public.employees to authenticated;
alter table public.employees enable row level security;

-- The self clause also requires is_active so a locked employee with a live session reads nothing.
create policy "employees readable by self, admins and managers"
on public.employees
for select
to authenticated
using (
  (id = (select auth.uid()) and is_active)
  or (select private.is_admin())
  or (select private.current_employee_role()) = 'manager'
);

create policy "admins insert employees"
on public.employees
for insert
to authenticated
with check ((select private.is_admin()));

create policy "admins update employees"
on public.employees
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

revoke all on public.branches from anon, authenticated;
grant select, insert, update on public.branches to authenticated;
alter table public.branches enable row level security;

create policy "branches readable by admins and active employees"
on public.branches
for select
to authenticated
using (
  (select private.is_admin())
  or (is_active and (select private.current_employee_role()) is not null)
);

create policy "admins insert branches"
on public.branches
for insert
to authenticated
with check ((select private.is_admin()));

create policy "admins update branches"
on public.branches
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

revoke all on public.manager_branches from anon, authenticated;
grant select on public.manager_branches to authenticated;
alter table public.manager_branches enable row level security;

create policy "manager branches readable by admins and the manager"
on public.manager_branches
for select
to authenticated
using ((select private.is_admin()) or manager_id = (select auth.uid()));

revoke all on public.manager_permissions from anon, authenticated;
grant select on public.manager_permissions to authenticated;
alter table public.manager_permissions enable row level security;

create policy "manager permissions readable by admins and the manager"
on public.manager_permissions
for select
to authenticated
using ((select private.is_admin()) or manager_id = (select auth.uid()));

revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;
alter table public.audit_logs enable row level security;

create policy "audit logs readable by admins"
on public.audit_logs
for select
to authenticated
using ((select private.is_admin()));
