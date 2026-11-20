import type { ReactNode } from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`ui-skeleton animate-pulse motion-reduce:animate-none ${className}`} />;
}

// Screen readers hear one label instead of a run of empty shapes.
export function SkeletonRegion({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className={className}>
        {children}
      </div>
    </div>
  );
}

const TABLE_ROWS = 5;

export function TableSkeleton({ label, columns }: { label: string; columns: number }) {
  const columnIndexes = Array.from({ length: columns }, (_, index) => index);
  return (
    <SkeletonRegion label={label} className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>
            {columnIndexes.map((column) => (
              <th key={column}>
                <Skeleton className="h-3 w-14" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: TABLE_ROWS }, (_, row) => (
            <tr key={row}>
              {columnIndexes.map((column) => (
                <td key={column}>
                  {column === 0 ? (
                    <>
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="mt-2 h-3 w-24" />
                    </>
                  ) : (
                    <Skeleton className="h-4 w-16" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </SkeletonRegion>
  );
}

export function FormSkeleton({ label, fields }: { label: string; fields: number }) {
  return (
    <SkeletonRegion label={label} className="ui-card flex max-w-2xl flex-col gap-5">
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 rounded-2xl" />
        </div>
      ))}
      <Skeleton className="h-12 w-32 rounded-full" />
    </SkeletonRegion>
  );
}
