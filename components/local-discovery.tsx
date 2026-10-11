"use client";
import { useEffect, useState } from "react";
import { ExternalLink, MapPinned, ShieldQuestion } from "lucide-react";
import type { PlacesResponse, Trip } from "@/lib/types";
import { coreKey } from "@/lib/use-analysis";

export function LocalDiscovery({ trip }: { trip: Trip }) {
  const [data, setData] = useState<PlacesResponse | null>(null);
  const [error, setError] = useState(false);
  const key = coreKey(trip)!;
  useEffect(() => {
    const t = JSON.parse(key) as Trip;
    let off = false;
    setData(null); // eslint-disable-line react-hooks/set-state-in-effect
    setError(false);
    fetch("/api/places", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trip: t }) })
      .then((r) => r.json())
      .then((d) => { if (off) return; if (d.ok) setData(d); else setError(true); })
      .catch(() => !off && setError(true));
    return () => { off = true; };
  }, [key]);

  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold"><MapPinned size={20} className="text-brand" aria-hidden /> Tea Spots, Nature &amp; Hidden Places</h2>
      {error && <p className="mt-3 text-sm text-red-700">Couldn&apos;t load local suggestions right now. Everything else still works.</p>}
      {!data && !error && <div className="mt-4 grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24" />)}</div>}
      {data && (
        <>
          <p className={`mt-3 flex gap-2 rounded-lg p-3 text-xs ${data.mode === "live" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
            <ShieldQuestion size={16} className="shrink-0" aria-hidden /> {data.note}
          </p>
          <blockquote className="mt-3 rounded-lg border-l-4 border-brand bg-lavender p-3 text-sm text-navy">☕ {data.ammavanComment}</blockquote>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.places.map((p) => (
              <li key={p.id} className="rounded-xl border border-line p-3">
                <span className="chip">{p.category}</span>
                <h3 className="mt-1.5 text-sm font-bold">{p.name}</h3>
                <p className="mt-1 text-xs">{p.reason}</p>
                {p.distanceKm !== undefined && <p className="mt-1 text-xs">≈ {p.distanceKm} km from the city centre (straight line)</p>}
                <p className="mt-1 text-[11px] text-ink">{p.status === "osm-data" ? "Source: OpenStreetMap (unverified details)" : "Illustrative, not a verified place"}</p>
                <a href={p.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                  {p.status === "osm-data" ? "View on map" : "Search on map"} <ExternalLink size={12} aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
