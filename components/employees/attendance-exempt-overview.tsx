export function AttendanceExemptOverview() {
  return (
    <section className="mx-auto max-w-2xl rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
        Tổng quan
      </p>
      <h1 className="text-3xl font-extrabold tracking-[-0.04em]">Bạn không cần chấm công</h1>
      <p className="mt-3 max-w-xl leading-7 text-[var(--muted)]">
        Tài khoản này không được yêu cầu ghi nhận giờ vào và giờ ra. Khi có tính năng phù
        hợp với vai trò của bạn, chúng sẽ xuất hiện trong thanh điều hướng.
      </p>
    </section>
  );
}
