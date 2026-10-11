import type { RiskLevel } from "@/lib/types";

export const LEVEL_COLOR: Record<RiskLevel, string> = { Low: "#22b573", Moderate: "#f5a524", High: "#ef4444" };
const BG: Record<RiskLevel, string> = { Low: "bg-emerald-50 text-emerald-700", Moderate: "bg-amber-50 text-amber-700", High: "bg-red-50 text-red-700" };

export function RiskBadge({ level, suffix = "Risk" }: { level: RiskLevel; suffix?: string }) {
  return <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${BG[level]}`}>{level} {suffix}</span>;
}
