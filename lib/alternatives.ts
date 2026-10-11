/**
 * Alternative plans / Rescue Mode.
 * Each strategy makes CONCRETE changes to the trip inputs, then the SAME
 * deterministic engine (computeScore) re-scores the new plan. No score is ever
 * "subtracted" arbitrarily.
 */
import { computeScore, inr, HIGH_MIN } from "./scoring";
import type { ScoreResult, Trip } from "./types";

export type Change = { label: string; from: string; to: string };
export type Plan = {
  id: "cheapest" | "relaxed" | "best";
  name: string;
  tagline: string;
  trip: Trip;
  result: ScoreResult;
  delta: number; // new score - current score (negative = better)
  changes: Change[];
  benefits: string[];
  tradeoffs: string[];
};

const r5 = (n: number) => Math.round(n / 500) * 500; // round money to nearest ₹500
const h = (n: number) => `${Math.round(n * 10) / 10}h`;

function diff(a: Trip, b: Trip): Change[] {
  const out: Change[] = [];
  if (a.estimatedCost !== b.estimatedCost) out.push({ label: "Estimated cost", from: inr(a.estimatedCost), to: inr(b.estimatedCost) });
  if (a.activities !== b.activities) out.push({ label: "Planned activities", from: String(a.activities), to: String(b.activities) });
  if (a.sleepHours !== b.sleepHours) out.push({ label: "Sleep per night", from: h(a.sleepHours), to: h(b.sleepHours) });
  if (a.travelHoursPerDay !== b.travelHoursPerDay) out.push({ label: "Travel per day", from: h(a.travelHoursPerDay), to: h(b.travelHoursPerDay) });
  if (a.transfers !== b.transfers) out.push({ label: "Transport changes", from: String(a.transfers), to: String(b.transfers) });
  return out;
}

function prose(a: Trip, b: Trip, extraTrade: string): { benefits: string[]; tradeoffs: string[] } {
  const benefits: string[] = [];
  const tradeoffs: string[] = [extraTrade];
  const dc = b.estimatedCost - a.estimatedCost;
  if (dc < 0) benefits.push(`Saves about ${inr(-dc)} per person`);
  if (dc > 0) tradeoffs.push(`Costs about ${inr(dc)} more per person`);
  if (b.activities < a.activities) {
    benefits.push(`Less rushing: ${b.activities} activities instead of ${a.activities}`);
    tradeoffs.push(`Skips ${a.activities - b.activities} planned activities`);
  }
  if (b.sleepHours > a.sleepHours) benefits.push(`More rest: ${h(b.sleepHours)} sleep per night`);
  if (b.travelHoursPerDay < a.travelHoursPerDay) benefits.push(`Less time in transit: ${h(b.travelHoursPerDay)} per day`);
  if (b.transfers < a.transfers) {
    benefits.push(`Fewer transfers (${b.transfers} vs ${a.transfers})`);
    tradeoffs.push("Direct routes may cost more or limit your choices");
  }
  if (!benefits.length) benefits.push("Keeps your plan largely as it is");
  return { benefits, tradeoffs };
}

export function buildAlternatives(trip: Trip) {
  const current = computeScore(trip);
  const d = trip.days;
  const budget = trip.budgetPerPerson;

  const cheapestTrip: Trip = {
    ...trip,
    estimatedCost: Math.max(500, Math.min(trip.estimatedCost, r5(Math.min(trip.estimatedCost * 0.75, budget * 0.85)))),
    activities: Math.max(1, Math.min(trip.activities, Math.round(trip.activities * 0.8))),
    travelHoursPerDay: Math.min(trip.travelHoursPerDay, Math.max(1, Math.round(trip.travelHoursPerDay * 0.85 * 2) / 2)),
    transfers: Math.max(0, trip.transfers - 1),
    sleepHours: Math.max(trip.sleepHours, 7),
  };
  const relaxedTrip: Trip = {
    ...trip,
    estimatedCost: Math.max(500, Math.min(trip.estimatedCost, r5(trip.estimatedCost * 0.9))),
    activities: Math.max(1, Math.min(trip.activities, Math.ceil(d * 1.5))),
    travelHoursPerDay: Math.min(trip.travelHoursPerDay, 3),
    transfers: Math.max(0, Math.floor(trip.transfers / 2)),
    sleepHours: Math.max(trip.sleepHours, 8),
  };
  const bestCost = trip.estimatedCost > budget * 0.9 ? r5(budget * 0.9) : Math.min(r5(budget * 0.9), r5(trip.estimatedCost * 1.1));
  const bestTrip: Trip = {
    ...trip,
    estimatedCost: Math.max(500, bestCost),
    activities: Math.max(1, Math.min(trip.activities, Math.round(d * 2.2))),
    travelHoursPerDay: Math.min(trip.travelHoursPerDay, 4.5),
    transfers: Math.min(trip.transfers, Math.ceil(d / 2)),
    sleepHours: Math.max(trip.sleepHours, 7.5),
  };

  const defs: { id: Plan["id"]; name: string; tagline: string; trip: Trip; trade: string }[] = [
    { id: "cheapest", name: "Cheapest Plan", tagline: "Trim spending and the busiest days", trip: cheapestTrip, trade: "Fewer paid experiences and splurges" },
    { id: "relaxed", name: "Most Relaxed Plan", tagline: "Slow mornings, short transits, full sleep", trip: relaxedTrip, trade: "You will see fewer attractions in total" },
    { id: "best", name: "Best Experience Plan", tagline: "Balanced pace with the best value for money", trip: bestTrip, trade: "Still needs advance booking for popular spots" },
  ];

  const plans: Plan[] = defs.map((p) => {
    const result = computeScore(p.trip);
    return { id: p.id, name: p.name, tagline: p.tagline, trip: p.trip, result, delta: result.score - current.score, changes: diff(trip, p.trip), ...prose(trip, p.trip, p.trade) };
  });

  const rescue = current.score > HIGH_MIN;
  const lowest = [...plans].sort((a, b) => a.result.score - b.result.score)[0];
  const recommendedId = rescue ? lowest.id : "best";
  return { current, plans, rescue, recommendedId };
}
