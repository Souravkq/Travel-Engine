"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Calendar, Lightbulb, LifeBuoy, Pencil, Plus, X } from "lucide-react";
import { AmmavanAvatar } from "@/components/ammavan-avatar";
import { AmmavanVerdict } from "@/components/ammavan-verdict";
import { LocalDiscovery } from "@/components/local-discovery";
import { NoTrip } from "@/components/no-trip";
import { RecommendationCard } from "@/components/recommendation-card";
import { RiskBreakdown } from "@/components/risk-breakdown";
import { RiskGauge } from "@/components/risk-gauge";
import { SmartImage } from "@/components/smart-image";
import { SoloCompanion } from "@/components/solo-companion";
import { imageForDestination } from "@/lib/images";
import { destinationList, inr } from "@/lib/scoring";
import { clearTrip, useTrip } from "@/lib/trip-storage";
import type { AmmavanResponse } from "@/lib/types";
import { coreKey, useAnalysis } from "@/lib/use-analysis";

const CACHE = "tre:ammavan:";

export default function ResultsPage() {
  const router = useRouter();
  const { trip, loaded, setTrip } = useTrip();
  const { result, error } = useAnalysis(trip);
  const [ammavan, setAmmavan] = useState<AmmavanResponse | null>(null);
  const [applied, setApplied] = useState(false);
  const key = coreKey(trip);

  const fetchVerdict = useCallback(async (force: boolean) => {
    if (!key) return;
    const cached = !force && sessionStorage.getItem(CACHE + key);
    if (cached) { setAmmavan(JSON.parse(cached)); return; }
    setAmmavan(null);
    try {
      const r = await fetch("/api/ammavan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trip: JSON.parse(key) }) });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error("bad");
      setAmmavan(d.ammavan);
      if (d.ammavan.source === "sarvam") sessionStorage.setItem(CACHE + key, JSON.stringify(d.ammavan));
    } catch {
      setAmmavan({ headline: "Ammavan stepped out for chaya…", mood: "worried", verdict: "I couldn't reach the server just now, but your score and breakdown above are still reliable.", topRisks: [], recommendations: [], source: "fallback", reason: "network" });
    }
  }, [key]);

  useEffect(() => { void fetchVerdict(false); }, [fetchVerdict]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (sessionStorage.getItem("tre:applied")) { sessionStorage.removeItem("tre:applied"); setApplied(true); } // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  if (!loaded) return null;
  if (!trip) return <NoTrip />;
  if (error) return (
    <div className="card mx-auto mt-10 max-w-lg p-8 text-center">
      <h1 className="text-xl font-bold">We couldn&apos;t analyse this trip</h1>
      <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>
      <Link href="/trip" className="btn-primary mt-5">Edit Trip</Link>
    </div>
  );

  const high = result?.level === "High";
  const dests = destinationList(trip);

  return (
    <div className="space-y-6">
      {applied && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
          <span>✅ Your suggested changes were applied to your saved plan. This is the freshly re-analysed result.</span>
          <button aria-label="Dismiss" onClick={() => setApplied(false)}><X size={16} /></button>
        </div>
      )}
      {high && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm font-semibold text-red-900"><AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden /> High regret risk — Rescue Mode can rebuild this plan with three lower-risk options.</p>
          <Link href="/alternatives" className="btn-primary !bg-red-600 hover:!bg-red-700"><LifeBuoy size={16} aria-hidden /> Open Rescue Mode</Link>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-6 text-center">
          <h1 className="text-left text-lg font-bold">Your Travel Regret Risk Score</h1>
          {result ? <div className="mt-4"><RiskGauge score={result.score} level={result.level} /></div> : <div className="skeleton mx-auto mt-6 h-48 w-48 !rounded-full" role="status" aria-label="Calculating score" />}
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-lavender p-3 text-left">
            <AmmavanAvatar mood={ammavan?.mood ?? "amused"} size={52} thinking={!ammavan} />
            <p className="text-sm font-semibold text-navy">{ammavan ? ammavan.headline : "Ammavan is looking at your score…"}</p>
          </div>
          <p className="mt-3 text-xs">Heuristic estimate of planning risk from 0 (low) to 100 (high), not a statistically validated probability of regret.</p>
        </section>

        <section className="card overflow-hidden">
          <SmartImage src={imageForDestination(trip.destinations)} alt={dests[0] ?? "Destination"} className="h-40 w-full" />
          <div className="p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide">Trip Overview</h2>
            <p className="mt-1 text-xl font-bold text-navy">{dests.join(" · ")}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div><dt className="text-xs">Dates</dt><dd className="flex items-center gap-1 font-semibold text-navy"><Calendar size={13} aria-hidden />{trip.startDate} → {trip.endDate}</dd></div>
              <div><dt className="text-xs">Duration</dt><dd className="font-semibold text-navy">{trip.days} days</dd></div>
              <div><dt className="text-xs">Estimated cost vs reference budget</dt><dd className="font-semibold text-navy">{inr(trip.estimatedCost)} / {inr(trip.budgetPerPerson)}</dd></div>
              <div><dt className="text-xs">Traveller type</dt><dd className="font-semibold text-navy">{trip.travellerType} · {trip.style}</dd></div>
            </dl>
          </div>
        </section>
      </div>

      <AmmavanVerdict data={ammavan} loading={!ammavan} language={trip.language} onRetry={() => void fetchVerdict(true)} />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 text-lg font-bold">Why This Score?</h2>
          {result ? <RiskBreakdown result={result} /> : <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}</div>}
        </section>
        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Lightbulb size={18} className="text-brand" aria-hidden /> Top Recommendations</h2>
          {ammavan ? (
            ammavan.recommendations.length ? <ol className="space-y-3">{ammavan.recommendations.map((r, i) => <RecommendationCard key={i} index={i + 1} text={r} />)}</ol> : <p className="text-sm">No recommendations available right now.</p>
          ) : <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-14" />)}</div>}
          {ammavan?.topRisks.length ? (
            <div className="mt-5"><h3 className="text-sm font-bold">Biggest risks</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{ammavan.topRisks.map((r, i) => <li key={i}>{r}</li>)}</ul></div>
          ) : null}
        </section>
      </div>

      <LocalDiscovery trip={trip} />
      {trip.travellerType === "Solo" && <SoloCompanion trip={trip} onChange={setTrip} note={ammavan?.soloNote} />}

      <div className="flex flex-wrap gap-3">
        <Link href="/insights" className="btn-primary">Detailed Insights <ArrowRight size={16} aria-hidden /></Link>
        <Link href="/alternatives" className={high ? "btn-primary !bg-red-600 hover:!bg-red-700" : "btn-ghost"}>{high ? "Rescue Mode: Alternative Suggestions" : "Alternative Suggestions"}</Link>
        <Link href="/trip" className="btn-ghost"><Pencil size={16} aria-hidden /> Edit Trip</Link>
        <button className="btn-ghost" onClick={() => { clearTrip(); router.push("/trip"); }}><Plus size={16} aria-hidden /> New Trip</button>
      </div>
    </div>
  );
}
