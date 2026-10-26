import { requireAdmin } from "@/app/api/_lib/auth";
import { readJsonObject } from "@/app/api/_lib/employee-input";
import { dbErrorResponse, errorResponse } from "@/app/api/_lib/errors";
import { loadMonthlyConfig, loadPeriod, toMonthlyConfig } from "@/app/api/_lib/payroll";
import { parseMonth, parseNonNegativeAmount, parsePositiveAmount, parseTime } from "@/app/api/_lib/payroll-input";
import { currentMonth } from "@/lib/date";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const monthDate = parseMonth(new URL(request.url).searchParams.get("month") ?? currentMonth());
  if (monthDate instanceof Response) return monthDate;

  const [config, period] = await Promise.all([
    loadMonthlyConfig(auth.supabase, monthDate),
    loadPeriod(auth.supabase, monthDate),
  ]);
  if (config instanceof Response) return config;
  if (period instanceof Response) return period;

  return Response.json(toMonthlyConfig(config, period.status !== "open"));
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const body = await readJsonObject(request);
  if (!body) return errorResponse(400, "Dữ liệu không hợp lệ.");
  const monthDate = parseMonth(body.month);
  if (monthDate instanceof Response) return monthDate;
  const overtimeStart = parseTime(body.overtimeStart, "Giờ bắt đầu tăng ca không hợp lệ.");
  if (overtimeStart instanceof Response) return overtimeStart;
  const overtimeEnd = parseTime(body.overtimeEnd, "Giờ kết thúc tăng ca không hợp lệ.");
  if (overtimeEnd instanceof Response) return overtimeEnd;
  const overtimeHourlyRate = parseNonNegativeAmount(body.overtimeHourlyRate, "Lương tăng ca phải là số nguyên không âm.");
  if (overtimeHourlyRate instanceof Response) return overtimeHourlyRate;
  const maxShiftMinutes = parsePositiveAmount(body.maxShiftMinutes, "Thời lượng tối đa của ca không hợp lệ.");
  if (maxShiftMinutes instanceof Response) return maxShiftMinutes;
  if (maxShiftMinutes > 48 * 60) return errorResponse(400, "Thời lượng tối đa của ca không được quá 48 giờ.");

  const { supabase, employee } = auth;
  // Makes sure the month's row exists, copied from the latest earlier month, before updating it.
  const existing = await loadMonthlyConfig(supabase, monthDate);
  if (existing instanceof Response) return existing;

  const { data, error } = await supabase
    .from("monthly_configs")
    .update({
      overtime_start: overtimeStart,
      overtime_end: overtimeEnd,
      overtime_hourly_rate: overtimeHourlyRate,
      max_shift_minutes: maxShiftMinutes,
      updated_at: new Date().toISOString(),
      updated_by: employee.id,
    })
    .eq("month", monthDate)
    .select("month, overtime_start, overtime_end, overtime_hourly_rate, max_shift_minutes")
    .single();
  if (error) return dbErrorResponse(error);

  return Response.json(toMonthlyConfig(data, false));
}
