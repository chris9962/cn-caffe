alter type public.manager_permission add value if not exists 'payroll.view';

-- The new enum value cannot be used as a literal in the transaction that adds it, so this compares text.
create function private.can_view_payroll()
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
        select 1 from public.manager_permissions
        where manager_id = auth.uid() and permission::text = 'payroll.view'
      )
    );
$$;

revoke execute on function private.can_view_payroll() from public, anon;
grant execute on function private.can_view_payroll() to authenticated;

-- Managers with the permission read pay; writing it stays with admins and directors.
drop policy "pay rates readable by admins and the employee" on public.pay_rates;
create policy "pay rates readable by payroll viewers and the employee"
on public.pay_rates
for select
to authenticated
using ((select private.can_view_payroll()) or (employee_id = (select auth.uid()) and (select private.current_employee_role()) is not null));

drop policy "pay adjustments readable by admins and the employee" on public.pay_adjustments;
create policy "pay adjustments readable by payroll viewers and the employee"
on public.pay_adjustments
for select
to authenticated
using ((select private.can_view_payroll()) or (employee_id = (select auth.uid()) and (select private.current_employee_role()) is not null));

drop policy "payroll versions readable by admins" on public.payroll_versions;
create policy "payroll versions readable by payroll viewers"
on public.payroll_versions
for select
to authenticated
using ((select private.can_view_payroll()));

drop policy "payslips readable by admins and the employee" on public.payslips;
create policy "payslips readable by payroll viewers and the employee"
on public.payslips
for select
to authenticated
using (
  (select private.can_view_payroll())
  or (
    employee_id = (select auth.uid())
    and (select private.current_employee_role()) is not null
    and private.is_current_payslip_version(version_id)
  )
);

-- Estimates need every valid shift, also at branches the manager does not run; other statuses stay hidden.
drop policy "shifts readable by owner and branch viewers" on public.shifts;
create policy "shifts readable by owner, branch viewers and payroll viewers"
on public.shifts
for select
to authenticated
using (
  employee_id = (select auth.uid())
  or private.has_branch_permission(branch_id, 'shifts.view')
  or (status = 'valid' and (select private.can_view_payroll()))
);
