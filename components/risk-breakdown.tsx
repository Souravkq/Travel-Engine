import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import type { ScoreResult, RiskLevel } from "@/lib/types";
import { LEVEL_COLOR, RiskBadge } from "./risk-badge";

const ICON: Record<RiskLevel, typeof CheckCircle2> = { Low: CheckCircle2, Moderate: AlertTriangle, High: XCircle };

export function RiskBreakdown({ result }: { result: ScoreResult }) {
  return (
    <div>
      <ul className="space-y-4">
        {result.factors.map((f) => {
          const Icon = ICON[f.level];
          return (
            <li key={f.id}>
              <div className="flex items-start gap-2">
                <Icon size={18} style={{ color: LEVEL_COLOR[f.level] }} className="mt-0.5 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-navy">{f.name}</span>
                    <RiskBadge level={f.level} />
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-soft" aria-hidden>
                    <div className="h-full rounded-full" style={{ width: `${f.score}%`, background: LEVEL_COLOR[f.level] }} />
                  </div>
                  <p className="mt-1 text-xs text-ink">
                    Score {f.score}/100 × weight {Math.round(f.weight * 100)}% = <strong>{f.contribution}</strong> points
                  </p>
                  <p className="mt-1 text-sm">{f.explanation}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 rounded-lg bg-lavender p-3 text-xs">
        <p className="font-mono text-[11px] text-navy">
          Score = 0.35×Budget + 0.30×Schedule + 0.22×Fatigue + 0.13×Transport = {result.score}
        </p>
        <p className="mt-2 flex gap-1.5"><Info size={14} className="mt-0.5 shrink-0" aria-hidden />{result.disclaimer}</p>
      </div>
    </div>
  );
}
