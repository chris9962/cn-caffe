"use client";

import { useFetch } from "@/hooks/use-fetch";
import type { Instrument } from "@/types/instrument";

export function InstrumentList() {
  const {
    data: instruments,
    error,
    isLoading,
  } = useFetch<Instrument[]>("/api/instruments");

  if (isLoading) {
    return <p role="status">Loading instruments...</p>;
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
