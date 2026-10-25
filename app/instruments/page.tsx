import type { Metadata } from "next";
import { InstrumentList } from "@/components/instruments/instrument-list";

export const metadata: Metadata = { title: "Instruments" };

export default function InstrumentsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl p-8">
      <h1 className="mb-4 text-2xl font-semibold">Instruments</h1>
      <InstrumentList />
    </main>
  );
}
