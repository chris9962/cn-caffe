import { formatDateTime } from "@/lib/date";
import type { PayrollVersion } from "@/types/payroll";

type PayrollVersionListProps = {
  versions: PayrollVersion[];
  shownVersion: number | null;
  onShow: (version: number) => void;
  // Set while an older version is picked; it returns to the month's current view.
  onShowCurrent: (() => void) | null;
};

export function PayrollVersionList({ versions, shownVersion, onShow, onShowCurrent }: PayrollVersionListProps) {
  return (
    <section aria-labelledby="versions-heading" className="ui-card flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="versions-heading" className="ui-heading">
          Các lần chốt
        </h2>
        {onShowCurrent && (
          <button type="button" onClick={onShowCurrent} className="ui-link text-sm">
            Về bản hiện tại
          </button>
        )}
      </div>
      <ol className="flex flex-col divide-y divide-[var(--line)]">
        {versions.map((item) => (
          <li key={item.version} className="flex flex-wrap items-start justify-between gap-3 py-3">
            <div className="text-sm">
              <p className="font-semibold">Phiên bản {item.version}</p>
              <p className="ui-hint">
                Chốt {formatDateTime(item.closedAt)}
                {item.closedByName ? ` bởi ${item.closedByName}` : ""}
              </p>
              {item.reopenedAt && (
                <p className="ui-hint">
                  Mở lại {formatDateTime(item.reopenedAt)}
                  {item.reopenedByName ? ` bởi ${item.reopenedByName}` : ""}: {item.reopenReason}
                </p>
              )}
            </div>
            {shownVersion === item.version ? (
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                Đang xem
              </span>
            ) : (
              <button type="button" onClick={() => onShow(item.version)} className="ui-btn-quiet min-h-10 px-4 text-sm">
                Xem<span className="sr-only"> phiên bản {item.version}</span>
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
