"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DestinationCard } from "@/components/destination-card";
import { EXAMPLES, EXAMPLE_FILTERS, exampleScore, exampleToTrip } from "@/lib/examples";
import { writeTrip } from "@/lib/trip-storage";

export default function ExamplesPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof EXAMPLE_FILTERS)[number]>("All");
  const shown = EXAMPLES.filter((e) => filter === "All" || e.tags.includes(filter));

  function tryTrip(id: string) {
    const ex = EXAMPLES.find((e) => e.id === id)!;
    writeTrip(exampleToTrip(ex));
    router.push("/trip");
  }

  return (
    <div>
      <h1 className="text-center text-3xl font-bold">Example Trips</h1>
      <p className="mt-2 text-center text-sm">See how the Travel Regret Engine scores different travellers. Scores are illustrative examples calculated from the sample data.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2" role="group" aria-label="Filter examples">
        {EXAMPLE_FILTERS.map((f) => (
          <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${filter === f ? "border-brand bg-brand text-white" : "border-line bg-white text-navy hover:bg-lavender"}`}>{f}</button>
        ))}
      </div>
      {shown.length === 0 ? <p className="mt-10 text-center text-sm">No examples in this category yet.</p> : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((ex) => {
            const r = exampleScore(ex);
            return <DestinationCard key={ex.id} title={ex.title} image={ex.image} tags={ex.tags} score={r.score} level={r.level} onTry={() => tryTrip(ex.id)} />;
          })}
        </div>
      )}
    </div>
  );
}
