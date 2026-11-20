"use client";

import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";
import { useFetch } from "@/hooks/use-fetch";
import type { Instrument } from "@/types/instrument";

export function InstrumentList() {
  const {
    data: instruments,
    error,
    isLoading,
  } = useFetch<Instrument[]>("/api/instruments");

  if (isLoading) {
    return (
      <SkeletonRegion label="Loading instruments..." className="flex flex-col gap-2 pl-6">
        {Array.from({ length: 3 }, (_, row) => (
          <Skeleton key={row} className="h-4 w-40" />
        ))}
      </SkeletonRegion>
    );
  }

  if (error) {
    return (
      <p role="alert" className="text-red-700 dark:text-red-400">
        {error}
      </p>
    );
  }

  return (
    <ul className="list-disc pl-6">
      {instruments?.map((instrument) => (
        <li key={instrument.id}>{instrument.name}</li>
      ))}
    </ul>
  );
}
