import type { RiskLevel } from "@/lib/types";
import { LEVEL_COLOR } from "./risk-badge";

/** 270° SVG ring gauge, 0–100. */
export function RiskGauge({ score, level, size = 220 }: { score: number; level: RiskLevel; size?: number }) {
  const stroke = size * 0.085;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const arc = 0.75 * C;
  const filled = (arc * Math.min(100, Math.max(0, score))) / 100;
  const color = LEVEL_COLOR[level];
  return (
    <div className="relative mx-auto" style={{ width: size, height: size * 0.88 }} role="img" aria-label={`Regret risk ${score} out of 100, ${level}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute left-0 top-0">
        <g transform={`rotate(135 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ece9ff" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${arc} ${C}`} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${filled} ${C}`} style={{ transition: "stroke-dasharray .8s ease" }} />
        </g>
      </svg>
      <div className="absolute inset-x-0 text-center" style={{ top: size * 0.3 }}>
        <div className="font-bold text-navy" style={{ fontSize: size * 0.2 }}>
          {score}<span className="font-medium text-ink" style={{ fontSize: size * 0.09 }}> / 100</span>
        </div>
        <div className="font-bold" style={{ color, fontSize: size * 0.085 }}>{level} Risk</div>
      </div>
    </div>
  );
}
