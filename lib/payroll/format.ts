const moneyFormatter = new Intl.NumberFormat("vi-VN");

export function formatMoney(amount: number): string {
  return `${moneyFormatter.format(amount)} đ`;
}

export function formatSignedMoney(amount: number): string {
  return amount > 0 ? `+${formatMoney(amount)}` : formatMoney(amount);
}

// Hours with up to two decimals, the way a payslip reads them: "7,5 giờ".
export function formatHours(minutes: number): string {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(minutes / 60)} giờ`;
}

export function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split("-");
  return `Tháng ${Number(monthNumber)}/${year}`;
}
