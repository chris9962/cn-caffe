import { requirePayrollViewer } from "@/app/api/_lib/auth";
import { dbErrorResponse, errorResponse } from "@/app/api/_lib/errors";
import { computePayslips, loadPeriod, loadStoredPayslips } from "@/app/api/_lib/payroll";
import { parseMonth } from "@/app/api/_lib/payroll-input";
import { currentMonth, monthRange } from "@/lib/date";
import type { BlockingShift, PayrollMonth, PayrollVersion } from "@/types/payroll";
import type { ShiftStatus } from "@/types/shift";

const BLOCKING_LIMIT = 200;

type BlockingRow = { id: string; work_date: string; status: ShiftStatus; employees: { full_name: string } | null };

export async function GET(request: Request) {
  const auth = await requirePayrollViewer();
  if ("response" in auth) return auth.response;
  const { supabase, canManage } = auth;

  const searchParams = new URL(request.url).searchParams;
  const month = searchParams.get("month") ?? currentMonth();
  const monthDate = parseMonth(month);
  if (monthDate instanceof Response) return monthDate;
  const range = monthRange(month)!;
  const versionParam = searchParams.get("version");
  const requestedVersion = versionParam === null ? null : Number(versionParam);
  if (requestedVersion !== null && !(Number.isInteger(requestedVersion) && requestedVersion > 0)) {
    return errorResponse(400, "Phiên bản không hợp lệ.");
  }

  const period = await loadPeriod(supabase, monthDate);
  if (period instanceof Response) return period;

  const [versionsResult, blockingResult] = await Promise.all([
    supabase
      .from("payroll_versions")
      .select("version, closed_at, closed_by, reopened_at, reopened_by, reopen_reason")
      .eq("month", monthDate)
      .order("version", { ascending: false }),
    supabase
      .from("shifts")
      .select("id, work_date, status, employees(full_name)")
      .gte("work_date", range.from)
      .lt("work_date", range.to)
      .in("status", ["open", "missing_checkout", "pending_review"])
      .order("work_date")
      .limit(BLOCKING_LIMIT)
      .overrideTypes<BlockingRow[], { merge: false }>(),
  ]);
  if (versionsResult.error) return dbErrorResponse(versionsResult.error);
  if (blockingResult.error) return dbErrorResponse(blockingResult.error);

  const actorIds = [
    ...new Set(versionsResult.data.flatMap((row) => [row.closed_by, row.reopened_by]).filter((id) => id !== null)),
  ];
  const names = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data, error } = await supabase.from("employees").select("id, full_name").in("id", actorIds);
    if (error) return dbErrorResponse(error);
    for (const row of data) names.set(row.id, row.full_name);
  }
  const versions: PayrollVersion[] = versionsResult.data.map((row) => ({
    version: row.version,
    closedAt: row.closed_at,
    closedByName: row.closed_by ? (names.get(row.closed_by) ?? null) : null,
    reopenedAt: row.reopened_at,
    reopenedByName: row.reopened_by ? (names.get(row.reopened_by) ?? null) : null,
    reopenReason: row.reopen_reason,
  }));

  const shownVersion = requestedVersion ?? (period.status === "closed" ? period.currentVersion : null);
  if (shownVersion !== null && !versions.some((item) => item.version === shownVersion)) {
    return errorResponse(404, "Không tìm thấy phiên bản này.");
  }
  const payslips =
    shownVersion === null
      ? await computePayslips(supabase, month)
      : await loadStoredPayslips(supabase, monthDate, shownVersion);
  if (payslips instanceof Response) return payslips;

  const blockingShifts: BlockingShift[] = blockingResult.data.map((row) => ({
    id: row.id,
    employeeName: row.employees?.full_name ?? "",
    workDate: row.work_date,
    status: row.status,
  }));

  const result: PayrollMonth = {
    month,
    canManage,
    status: period.status,
    hasEnded: month < currentMonth(),
    versions,
    shownVersion,
    blockingShifts,
    payslips,
  };
  return Response.json(result);
}
