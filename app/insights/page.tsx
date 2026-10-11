"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpen, ClipboardList, Compass, Search, Sparkles, type LucideIcon } from "lucide-react";
import { NoTrip } from "@/components/no-trip";
import { RiskBadge } from "@/components/risk-badge";
import { RiskGauge } from "@/components/risk-gauge";
import { buildInsights, SECTIONS, type Insight, type Section } from "@/lib/insights";
import { useTrip } from "@/lib/trip-storage";
import { useAnalysis } from "@/lib/use-analysis";

const ICONS: Record<Section, LucideIcon> = { overview: BookOpen, regrets: AlertTriangle, missing: Search, logistics: ClipboardList, recs: Sparkles };

function InsightCard({ i }: { i: Insight }) {
  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-bold">{i.title}</h3>
        <RiskBadge level={i.level} />
      </div>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-brand">
        {i.basis === "calculated" ? "Calculated from your inputs" : "General travel advice — not verified"}
      </p>
      <p className="mt-2 text-sm">{i.summary}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg bg-lavender p-3 text-sm"><p className="font-semibold text-navy">Why it matters</p><p className="mt-1 text-xs">{i.why}</p></div>
        <div className="rounded-lg bg-emerald-50 p-3 text-sm"><p className="font-semibold text-emerald-900">What to do</p><p className="mt-1 text-xs text-emerald-900">{i.solution}</p></div>
      </div>
      <p className="mt-3 border-l-4 border-brand pl-3 text-sm italic text-navy">☕ Ammavan: {i.comment}</p>
    </article>
  );
}

export default function InsightsPage() {
  const { trip, loaded } = useTrip();
  const { result, loading, error } = useAnalysis(trip);
  const [section, setSection] = useState<Section>("regrets");
  const insights = useMemo(() => (trip && result ? buildInsights(trip, result) : []), [trip, result]);

  if (!loaded) return null;
  if (!trip) return <NoTrip />;
  const shown = insights.filter((i) => i.section === section);

  return (
    <div>
      <h1 className="text-3xl font-bold">Detailed Insights</h1>
      <p className="mt-1 text-sm">A closer look at potential areas of regret and how to avoid them.</p>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <div className="mt-6 grid gap-6 md:grid-cols-[230px_1fr]">
        <nav aria-label="Insight sections" className="card flex gap-1 overflow-x-auto p-2 md:flex-col md:self-start">
          {SECTIONS.map((s) => {
            const Icon = ICONS[s.id];
            const on = section === s.id;
            return (
              <button key={s.id} onClick={() => setSection(s.id)} aria-current={on ? "true" : undefined}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-semibold md:whitespace-normal ${on ? "bg-brand-soft text-brand" : "text-navy hover:bg-lavender"}`}>
                <Icon size={16} aria-hidden /> {s.label}
              </button>
            );
          })}
        </nav>

        <div className="space-y-4">
          {loading && <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="skeleton h-40" />)}</div>}
          {result && section === "overview" && (
            <section className="card p-5">
              <h2 className="text-lg font-bold">Overview</h2>
              <div className="mt-3 grid items-center gap-4 sm:grid-cols-[200px_1fr]">
                <RiskGauge score={result.score} level={result.level} size={180} />
                <ul className="space-y-2 text-sm">
                  {result.factors.map((f) => <li key={f.id} className="flex items-center justify-between gap-3"><span>{f.name}</span><span className="flex items-center gap-2"><strong className="text-navy">{f.score}</strong><RiskBadge level={f.level} /></span></li>)}
                  <li className="pt-2 text-xs">{insights.filter((i) => i.section === "regrets").length} potential regret(s) found. Pick a section on the left to dig in.</li>
                </ul>
              </div>
              <p className="mt-3 text-xs">{result.disclaimer}</p>
            </section>
          )}
          {result && section !== "overview" && (shown.length ? shown.map((i) => <InsightCard key={i.id} i={i} />) : <div className="card p-6 text-sm">Nothing flagged here — nice. {section === "regrets" && "Your inputs didn't trigger any notable regret risks."}</div>)}
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/results" className="btn-ghost">Back to Results</Link>
            <Link href="/alternatives" className="btn-primary"><Compass size={16} aria-hidden /> Alternative Suggestions</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
