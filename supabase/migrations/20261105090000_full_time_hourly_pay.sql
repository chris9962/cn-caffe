-- Ấm pays full time by the hour: up to the daily required hours at the employee's rate, the rest at a shared overtime rate.
alter table public.monthly_configs
  add column full_time_daily_minutes integer not null default 600 check (full_time_daily_minutes > 0),
  add column full_time_overtime_hourly_rate integer not null default 20000 check (full_time_overtime_hourly_rate >= 0);

create or replace function private.config_for_month(p_month date)
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
  insert into public.monthly_configs (
    month, overtime_start, overtime_end, overtime_hourly_rate, max_shift_minutes,
    full_time_daily_minutes, full_time_overtime_hourly_rate
  )
  select p_month, overtime_start, overtime_end, overtime_hourly_rate, max_shift_minutes,
    full_time_daily_minutes, full_time_overtime_hourly_rate
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
