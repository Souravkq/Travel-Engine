/**
 * REGRET RISK ENGINE (deterministic, explainable)
 *
 * Regret Risk Score =
 *     0.35 x Budget Risk
 *   + 0.30 x Schedule Risk
 *   + 0.22 x Fatigue Risk
 *   + 0.13 x Transport Risk
 *
 * Each factor is first normalised to 0-100 using simple piecewise-linear
 * curves (see `piecewise`). The weights below are INITIAL HEURISTICS chosen
 * because overspending and cramming too much in are the most common sources
 * of trip regret, then tiredness, then messy logistics. They are NOT fitted to
 * data. The result is a heuristic indicator, NOT a validated probability.
 *
 * The LLM (AI Ammavan) never sees a chance to change these numbers: it only
 * receives them to explain them.
 */
import type { Factor, FactorId, RiskLevel, ScoreResult, Trip } from "./types";

// ---- Configurable weights (must add up to 1) ----
export const WEIGHTS: Record<FactorId, number> = {
  budget: 0.35,
  schedule: 0.3,
  fatigue: 0.22,
  transport: 0.13,
};
const weightSum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(weightSum - 1) > 1e-9) {
  throw new Error(`Risk weights must sum to 1 (got ${weightSum})`);
}

/**
 * The app no longer asks for a budget. We compare the estimated cost with a
 * REFERENCE budget = reference daily budget x days. A trip may carry its own
 * reference (e.g. the example trips); otherwise this default is used.
 */
export const DEFAULT_DAILY_BUDGET = 5000; // INR per person per day

/** Sleep at or below this many hours is treated as a severe fatigue risk. */
export const SEVERE_SLEEP_MAX = 3;

// ---- Risk level thresholds ----
export const LOW_MAX = 35; // score < 35  => Low
export const HIGH_MIN = 65; // score > 65 => High
export function levelFor(score: number): RiskLevel {
  if (score > HIGH_MIN) return "High";
  if (score >= LOW_MAX) return "Moderate";
  return "Low";
}

// ---- Style / traveller multipliers on how heavy a schedule *feels* ----
const STYLE_LOAD: Record<Trip["style"], number> = {
  Relaxation: 1.3, // relaxers tolerate fewer activities
  Adventure: 0.9, // adventurers tolerate more
  Culture: 1.05,
  Food: 1.0,
  Mixed: 1.0,
};
const TRAVELLER_LOAD: Record<Trip["travellerType"], number> = {
  Solo: 1.0,
  Couple: 1.0,
  Friends: 0.95,
  Family: 1.15, // kids / elders slow things down
};
const TRAVELLER_FATIGUE: Record<Trip["travellerType"], number> = {
  Solo: 1.0,
  Couple: 1.0,
  Friends: 1.0,
  Family: 1.1,
};

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
/** Guards against NaN / Infinity so a bad number can never poison the score. */
const safe = (n: number, fallback = 0) => (Number.isFinite(n) ? n : fallback);

/** Linear interpolation through [x, y] points (sorted by x). Clamped at both ends. */
function piecewise(x: number, pts: [number, number][]): number {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x0, y0] = pts[i - 1];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return pts[pts.length - 1][1];
}

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const r1 = (n: number) => Math.round(n * 10) / 10;

export function destinationList(trip: Pick<Trip, "destinations">): string[] {
  return trip.destinations
    .split(/[,;\n→>]+/)
    .map((d) => d.trim())
    .filter(Boolean);
}

export function budgetRisk(t: Trip) {
  const ratio = safe(t.estimatedCost / Math.max(1, t.budgetPerPerson));
  const score = piecewise(ratio, [
    [0, 0],
    [0.7, 10],
    [1, 45],
    [1.5, 100],
  ]);
  const pct = Math.round(ratio * 100);
  const explanation =
    ratio > 1
      ? `Estimated cost ${inr(t.estimatedCost)} is ${pct}% of the reference budget (${inr(t.budgetPerPerson)}, about ${inr(t.budgetPerPerson / t.days)}/day) — over by ${inr(t.estimatedCost - t.budgetPerPerson)}.`
      : ratio > 0.85
        ? `Estimated cost ${inr(t.estimatedCost)} uses ${pct}% of the reference budget (${inr(t.budgetPerPerson)}, about ${inr(t.budgetPerPerson / t.days)}/day), leaving a thin buffer for surprises.`
        : `Estimated cost ${inr(t.estimatedCost)} uses ${pct}% of the reference budget (${inr(t.budgetPerPerson)}, about ${inr(t.budgetPerPerson / t.days)}/day), which leaves a comfortable buffer.`;
  return { score, explanation };
}

export function scheduleRisk(t: Trip) {
  const perDay = safe(t.activities / Math.max(1, t.days));
  const effective = perDay * STYLE_LOAD[t.style] * TRAVELLER_LOAD[t.travellerType];
  const score = piecewise(effective, [
    [0, 0],
    [1.5, 15],
    [3, 60],
    [5, 100],
  ]);
  const explanation = `About ${r1(perDay)} planned activities per day (feels like ${r1(effective)} for a ${t.style.toLowerCase()} ${t.travellerType.toLowerCase()} trip). More than ~2 per day tends to leave little room for rest or delays.`;
  return { score, explanation };
}

export function fatigueRisk(t: Trip) {
  const sleep = safe(t.sleepHours, 8);
  const travel = safe(t.travelHoursPerDay);
  // Sleep deficit vs an 8h reference: 0h deficit = 0 risk, 4h+ deficit = 100 risk.
  const sleepRisk = piecewise(Math.max(0, 8 - sleep), [
    [0, 0],
    [4, 100],
  ]);
  const travelRisk = piecewise(travel, [
    [2, 0],
    [8, 100],
  ]);
  let score = clamp((0.55 * sleepRisk + 0.45 * travelRisk) * TRAVELLER_FATIGUE[t.travellerType]);
  // Severe override: almost no sleep is a safety issue, not just "a bit tired".
  if (sleep <= SEVERE_SLEEP_MAX) score = Math.max(score, sleep === 0 ? 100 : 90);

  let explanation = `${r1(sleep)}h sleep per night and ${r1(travel)}h in transit per day. Sleep below ~7h and long daily transit both add up to exhaustion.`;
  if (sleep === 0) {
    explanation = `You entered 0 hours of sleep. Going without sleep is not sustainable on a trip: alertness, judgement and mood drop sharply (especially risky when driving or riding), so fatigue is rated at the maximum. Most adults need roughly 7–9 hours.`;
  } else if (sleep <= SEVERE_SLEEP_MAX) {
    explanation = `Only ${r1(sleep)}h of sleep per night is severely low (plus ${r1(travel)}h in transit per day). Fatigue is rated very high because alertness and safety suffer; most adults need roughly 7–9 hours.`;
  }
  return { score, explanation };
}

export function transportRisk(t: Trip, destinationCount: number) {
  const effective = Math.max(t.transfers, destinationCount - 1);
  const perDay = safe(effective / Math.max(1, t.days));
  const score = piecewise(perDay, [
    [0, 0],
    [1.5, 100],
  ]);
  const explanation = `${effective} transport change${effective === 1 ? "" : "s"} over ${t.days} day${t.days === 1 ? "" : "s"} (~${r1(perDay)} per day). Every transfer adds risk of delays and wasted time.`;
  return { score, explanation };
}

export const FACTOR_NAMES: Record<FactorId, string> = {
  budget: "Budget pressure",
  schedule: "Schedule overload",
  fatigue: "Travel fatigue",
  transport: "Transport complexity",
};

export const DISCLAIMER =
  "This score is a heuristic risk indicator built from simple rules and initial weights. It is not a scientifically validated probability that you will regret your trip.";

export function computeScore(trip: Trip): ScoreResult {
  const parts: Record<FactorId, { score: number; explanation: string }> = {
    budget: budgetRisk(trip),
    schedule: scheduleRisk(trip),
    fatigue: fatigueRisk(trip),
    transport: transportRisk(trip, destinationList(trip).length),
  };

  const factors: Factor[] = (Object.keys(parts) as FactorId[]).map((id) => {
    const score = Math.round(clamp(parts[id].score));
    const weight = WEIGHTS[id];
    return {
      id,
      name: FACTOR_NAMES[id],
      score,
      weight,
      contribution: r1(score * weight),
      level: levelFor(score),
      explanation: parts[id].explanation,
    };
  });

  const raw = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
  const score = Math.round(clamp(raw));
  return { score, level: levelFor(score), factors, disclaimer: DISCLAIMER };
}
