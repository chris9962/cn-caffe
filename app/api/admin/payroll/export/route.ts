import ExcelJS from "exceljs";
import { requirePayrollViewer } from "@/app/api/_lib/auth";
import { errorResponse } from "@/app/api/_lib/errors";
import { loadPeriod, loadStoredPayslips } from "@/app/api/_lib/payroll";
import { parseMonth } from "@/app/api/_lib/payroll-input";
import { EMPLOYMENT_TYPE_LABELS, formatPhone } from "@/lib/employees/labels";

const MONEY = "#,##0";
const HOURS = "0.00";

const hours = (minutes: number) => Math.round((minutes / 60) * 100) / 100;

// Only a closed version is exported, so the file always matches what employees were paid.
export async function GET(request: Request) {
  const auth = await requirePayrollViewer();
  if ("response" in auth) return auth.response;

  const searchParams = new URL(request.url).searchParams;
  const month = searchParams.get("month") ?? "";
  const monthDate = parseMonth(month);
  if (monthDate instanceof Response) return monthDate;

  const period = await loadPeriod(auth.supabase, monthDate);
  if (period instanceof Response) return period;
  const versionParam = searchParams.get("version");
  const version = versionParam === null ? (period.status === "closed" ? period.currentVersion : null) : Number(versionParam);
  if (version === null || !(Number.isInteger(version) && version > 0)) {
    return errorResponse(409, "Chỉ xuất được bảng lương của tháng đã chốt.");
  }

  const payslips = await loadStoredPayslips(auth.supabase, monthDate, version);
  if (payslips instanceof Response) return payslips;
  if (payslips.length === 0) return errorResponse(404, "Không tìm thấy phiên bản này.");

  const branchNames = [...new Set(payslips.flatMap((payslip) => payslip.branches.map((branch) => branch.branchName)))].sort(
    (a, b) => a.localeCompare(b, "vi"),
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`Lương ${month}`);
  sheet.columns = [
    { header: "Họ tên", key: "name", width: 26 },
    { header: "Số điện thoại", key: "phone", width: 14 },
    { header: "Loại nhân viên", key: "type", width: 26 },
    ...branchNames.map((name, index) => ({
      header: `Giờ tại ${name || "chi nhánh đã đóng"}`,
      key: `branch${index}`,
      width: 18,
      style: { numFmt: HOURS },
    })),
    { header: "Giờ thường", key: "regularHours", width: 12, style: { numFmt: HOURS } },
    { header: "Giờ tăng ca", key: "overtimeHours", width: 12, style: { numFmt: HOURS } },
    { header: "Tiền giờ thường", key: "regularPay", width: 16, style: { numFmt: MONEY } },
    { header: "Tiền tăng ca", key: "overtimePay", width: 14, style: { numFmt: MONEY } },
    { header: "Lương cố định", key: "fixedPay", width: 16, style: { numFmt: MONEY } },
    { header: "Tổng cộng thêm", key: "additions", width: 16, style: { numFmt: MONEY } },
    { header: "Tổng trừ", key: "deductions", width: 14, style: { numFmt: MONEY } },
    { header: "Tổng lương", key: "total", width: 16, style: { numFmt: MONEY } },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1, xSplit: 1 }];

  for (const payslip of payslips) {
    const branchMinutes = new Map(payslip.branches.map((branch) => [branch.branchName, branch.minutes]));
    sheet.addRow({
      name: payslip.employeeName,
      phone: formatPhone(payslip.phone),
      type: payslip.employmentTypes.map((type) => EMPLOYMENT_TYPE_LABELS[type]).join(", "),
      ...Object.fromEntries(branchNames.map((name, index) => [`branch${index}`, hours(branchMinutes.get(name) ?? 0)])),
      regularHours: hours(payslip.totals.regularMinutes),
      overtimeHours: hours(payslip.totals.overtimeMinutes),
      regularPay: payslip.totals.regularPay,
      overtimePay: payslip.totals.overtimePay,
      fixedPay: payslip.totals.fixedPay,
      additions: payslip.totals.additions,
      deductions: payslip.totals.deductions,
      total: payslip.totals.total,
    });
  }

  const totalRow = sheet.addRow({
    name: "Tổng",
    total: payslips.reduce((sum, payslip) => sum + payslip.totals.total, 0),
  });
  totalRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bang-luong-${month}-v${version}.xlsx"`,
    },
  });
}
