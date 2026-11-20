import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";

const NAV_ITEMS = 4;

export function AppShellSkeleton({ label }: { label: string }) {
  return (
    <SkeletonRegion label={label} className="min-h-dvh md:grid md:grid-cols-[17rem_minmax(0,1fr)]">
      <div className="flex h-16 items-center justify-between border-b border-[var(--line)] px-4 md:hidden">
        <Skeleton className="size-10 rounded-[14px]" />
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="size-11 rounded-full" />
        </div>
      </div>

      <div className="sticky top-0 hidden h-dvh flex-col border-r border-[var(--line)] bg-[var(--surface)] p-5 md:flex">
        <div className="mb-10 flex items-center gap-3">
          <Skeleton className="size-10 rounded-[14px]" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          {Array.from({ length: NAV_ITEMS }, (_, item) => (
            <Skeleton key={item} className="h-12 rounded-2xl" />
          ))}
        </div>
        <div className="border-t border-[var(--line)] pt-5">
          <div className="mb-4 flex items-center gap-3">
            <Skeleton className="size-11 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 pt-5 sm:px-6 md:px-8 md:py-8 lg:px-10">
        <Skeleton className="h-10 w-56 max-w-full" />
        <Skeleton className="h-48 w-full max-w-3xl rounded-lg" />
        <Skeleton className="h-24 w-full max-w-3xl rounded-lg" />
      </div>

      <div className="fixed inset-x-0 bottom-0 flex justify-around border-t border-[var(--line)] bg-[var(--surface)] px-2 pt-2 pb-[max(.5rem,env(safe-area-inset-bottom))] md:hidden">
        {Array.from({ length: NAV_ITEMS }, (_, item) => (
          <div key={item} className="flex min-h-14 flex-col items-center justify-center gap-1.5">
            <Skeleton className="size-6 rounded-lg" />
            <Skeleton className="h-2.5 w-10" />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}
