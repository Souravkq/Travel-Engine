import { Check, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { Plan } from "@/lib/alternatives";
import { inr } from "@/lib/scoring";
import type { ScoreResult, Trip } from "@/lib/types";
import { RiskGauge } from "./risk-gauge";

function rows(t: Trip) {
  return [
    { label: "Cost vs reference budget", value: `${inr(t.estimatedCost)} of ${inr(t.budgetPerPerson)}` },
    { label: "Activities", value: `${t.activities} (${Math.round((t.activities / t.days) * 10) / 10}/day)` },
    { label: "Rest", value: `${t.sleepHours}h sleep/night` },
    { label: "Travel time", value: `${t.travelHoursPerDay}h/day, ${t.transfers} transfer${t.transfers === 1 ? "" : "s"}` },
  ];
}

function Col({ title, badge, trip, result, highlight }: { title: string; badge?: string; trip: Trip; result: ScoreResult; highlight?: boolean }) {
  return (
    <div className={`card p-5 ${highlight ? "border-2 border-emerald-400" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">{title}</h3>
        {badge && <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{badge}</span>}
      </div>
      <RiskGauge score={result.score} level={result.level} size={170} />
      <dl className="mt-3 space-y-2 text-sm">
        {rows(trip).map((r) => (
          <div key={r.label} className="flex justify-between gap-3 border-b border-line pb-1.5 last:border-0">
            <dt>{r.label}</dt><dd className="text-right font-semibold text-navy">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function AlternativeComparison({ current, currentTrip, plan }: { current: ScoreResult; currentTrip: Trip; plan: Plan }) {
  const better = plan.delta < 0;
  return (
    <div>
      <div className="grid gap-5 md:grid-cols-2">
        <Col title="Your Current Plan" trip={currentTrip} result={current} />
        <Col title={`Suggested: ${plan.name}`} badge={better ? "Lower Regret Risk" : plan.delta === 0 ? "Same Risk" : "Higher Risk"} trip={plan.trip} result={plan.result} highlight={better} />
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-navy">
        {better ? <TrendingDown size={16} className="text-emerald-600" aria-hidden /> : <TrendingUp size={16} className="text-red-500" aria-hidden />}
        Score {current.score} → {plan.result.score} ({plan.delta > 0 ? "+" : ""}{plan.delta}), recalculated by the same scoring engine
      </p>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="card p-5">
          <h4 className="font-bold">What changes</h4>
          {plan.changes.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {plan.changes.map((c) => <li key={c.label} className="flex justify-between gap-3"><span>{c.label}</span><span className="font-semibold text-navy">{c.from} → {c.to}</span></li>)}
            </ul>
          ) : <p className="mt-3 text-sm">No changes needed — your plan already fits this strategy.</p>}
        </div>
        <div className="card p-5">
          <h4 className="font-bold">Why it&apos;s better</h4>
          <ul className="mt-3 space-y-1.5 text-sm">{plan.benefits.map((b) => <li key={b} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />{b}</li>)}</ul>
          <h4 className="mt-4 font-bold">Trade-offs</h4>
          <ul className="mt-3 space-y-1.5 text-sm">{plan.tradeoffs.map((b) => <li key={b} className="flex gap-2"><Minus size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />{b}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}
