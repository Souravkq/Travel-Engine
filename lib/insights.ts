/**
 * Builds the Detailed Insights cards from the trip + deterministic score.
 * Each insight says whether it is CALCULATED from the user's inputs or a
 * GENERAL tip (never presented as a verified fact about a specific place).
 */
import { T, varsFor } from "./fallback";
import { destinationList } from "./scoring";
import type { FactorId, RiskLevel, ScoreResult, Trip } from "./types";

export type Section = "overview" | "regrets" | "missing" | "logistics" | "recs";
export const SECTIONS: { id: Section; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "regrets", label: "Potential Regrets" },
  { id: "missing", label: "What You're Missing" },
  { id: "logistics", label: "Logistics & Practical Tips" },
  { id: "recs", label: "Personalized Recommendations" },
];

export type Insight = {
  id: string;
  section: Exclude<Section, "overview">;
  title: string;
  level: RiskLevel;
  basis: "calculated" | "general";
  summary: string;
  why: string;
  solution: string;
  comment: string;
};

export function buildInsights(trip: Trip, result: ScoreResult): Insight[] {
  const out: Insight[] = [];
  const p = T[trip.language];
  const v = varsFor(trip);
  const f = (id: FactorId) => result.factors.find((x) => x.id === id)!;
  const perDay = trip.activities / trip.days;
  const dests = destinationList(trip);
  const interests = trip.interests.toLowerCase();

  // ---- Potential regrets (calculated) ----
  const regret = (id: FactorId, title: string, why: string, solution: string) => {
    const fac = f(id);
    if (fac.score < 20) return;
    out.push({ id: `regret-${id}`, section: "regrets", title, level: fac.level, basis: "calculated", summary: fac.explanation, why, solution, comment: p.factor[id].roast(v) });
  };
  regret("budget", "Budget may not stretch far enough", "Overspending is stressful during the trip and painful after it. Unplanned costs usually add up.", p.factor.budget.tip);
  regret("schedule", "Too many activities, too little rest", "Rushing means short, shallow visits and little time for the unplanned moments many travellers remember most.", p.factor.schedule.tip);
  regret("fatigue", "Fatigue may spoil the experience", "Tired travellers enjoy less, make worse decisions and are more likely to get ill.", p.factor.fatigue.tip);
  regret("transport", "Many transfers can eat your time", "Each change of vehicle risks delays, queues and lost sightseeing time.", p.factor.transport.tip);

  if (trip.sleepHours <= 3) {
    out.unshift({ id: "regret-severe-sleep", section: "regrets", title: trip.sleepHours === 0 ? "Zero sleep planned" : "Severely low sleep planned", level: "High", basis: "calculated", summary: f("fatigue").explanation, why: "Alertness, judgement and mood fall sharply without sleep, which matters most when travelling, driving or riding.", solution: "Block at least 6–7 hours of sleep every night first, then fit sightseeing around it. Avoid driving when tired.", comment: p.factor.fatigue.roast(v) });
  }
  if (perDay > 2) {
    out.push({ id: "regret-crowds", section: "regrets", title: "Popular attractions may take longer than planned", level: perDay > 3 ? "High" : "Moderate", basis: "general", summary: `With ~${Math.round(perDay * 10) / 10} activities per day, queues and crowds at popular places can easily push you off schedule. (General pattern, not live crowd data.)`, why: "Waiting time is rarely included in itineraries, so the day quietly overflows.", solution: "Add a 30–50% time buffer per activity, and visit popular places early or late in the day.", comment: p.generic });
  }
  if (dests.length > 1 && trip.days / dests.length < 2.5) {
    out.push({ id: "regret-spread", section: "regrets", title: "Too many destinations for the days available", level: "Moderate", basis: "calculated", summary: `${dests.length} destinations in ${trip.days} days is under ${Math.round((trip.days / dests.length) * 10) / 10} days each.`, why: "Packing, checking in and moving between places uses up a surprising amount of each day.", solution: "Drop the least exciting destination or stay at least 2–3 nights in each.", comment: p.generic });
  }

  // ---- What you're missing (general) ----
  if (!trip.interests) out.push({ id: "miss-interests", section: "missing", title: "No interests added yet", level: "Low", basis: "general", summary: "Without interests, suggestions stay generic.", why: "Trips tailored to what you love are less likely to feel like a checklist.", solution: "Edit your trip and add a few interests (food, hiking, temples, photography…).", comment: p.generic });
  if (perDay >= 2.5) out.push({ id: "miss-slack", section: "missing", title: "No unplanned time", level: "Moderate", basis: "calculated", summary: "Your plan has almost no slack for wandering, long meals or spontaneous detours.", why: "Unscheduled time is often where local discoveries happen.", solution: "Keep one free half-day for every 3–4 planned days.", comment: p.generic });
  out.push({ id: "miss-local", section: "missing", title: "Local neighbourhoods and everyday life", level: "Low", basis: "general", summary: "Itineraries built around famous sights can skip the everyday side of a place.", why: "Small streets, markets and tea stalls are often what visitors enjoy most — general observation, not a claim about your destination.", solution: "Reserve a few hours to walk a residential or market area without a plan. See the Local Discovery section on the results page.", comment: p.generic });
  if (trip.travellerType === "Solo") out.push({ id: "miss-group", section: "missing", title: "Shared experiences", level: "Low", basis: "general", summary: "Solo travel is great, but group activities make it easier to meet people.", why: "A guided walk or class gives structure and company in a public setting.", solution: "Pick one group activity in your first two days.", comment: p.solo });

  // ---- Logistics (general) ----
  const g = (id: string, title: string, summary: string, why: string, solution: string) =>
    out.push({ id, section: "logistics", title, level: "Low", basis: "general", summary, why, solution, comment: p.generic });
  g("log-buffer", "Keep a money buffer", "Even a well-planned budget gets surprised by fees, tips and detours.", "Costs like transfers, tips and fees are easy to underestimate.", "Keep 10–15% of your budget unallocated.");
  g("log-book", "Check and book key things early", "Popular tickets, trains and stays can sell out.", "Availability changes constantly and we can't check it for you.", "Verify opening hours and availability on official sites before you go.");
  g("log-offline", "Download offline maps and keep some cash", "Connectivity and card acceptance vary.", "Being stuck without a map or payment method is a classic travel stress.", "Save offline maps and carry a small amount of local currency.");
  if (trip.sleepHours < 7) g("log-sleep", "Protect your sleep", `You planned ${trip.sleepHours}h per night.`, "Sleep debt builds over a multi-day trip.", "Aim for 7–8 hours; schedule the earliest starts for the most important sights.");

  // ---- Personalised recommendations ----
  const rec = (id: string, title: string, summary: string, solution: string) =>
    out.push({ id, section: "recs", title, level: "Low", basis: "general", summary, why: "Based on your travel style, interests and traveller type.", solution, comment: p.generic });
  if (trip.style === "Food" || /food|eat|tea|street/.test(interests)) rec("rec-food", "Eat where locals eat", "Food lovers usually get the best value away from tourist streets.", "Ask your host or a local for one favourite spot per day and verify hours before going.");
  if (trip.style === "Adventure" || /trek|hike|adventure|surf/.test(interests)) rec("rec-adv", "Build in weather and safety margins", "Outdoor plans depend on conditions we cannot check for you.", "Check the official forecast shortly before you go and keep a flexible backup day.");
  if (trip.style === "Relaxation") rec("rec-relax", "Choose one base and slow down", "Relaxation trips work best with fewer moves.", "Stay in one or two places and add day trips only if you feel like it.");
  if (trip.style === "Culture") rec("rec-culture", "Pair big sights with quiet ones", "Culture trips tire people out through sheer volume.", "Alternate one major site with one small museum, temple or neighbourhood walk.");
  if (trip.travellerType === "Family") rec("rec-family", "Plan around the slowest traveller", "Families move at the pace of the youngest or oldest member.", "Schedule rest stops and keep the busiest activity for the morning.");
  if (trip.travellerType === "Couple") rec("rec-couple", "Plan one shared highlight per day", "Couples enjoy trips most when each day has one thing both truly want.", "Take turns choosing the day's highlight.");
  if (trip.travellerType === "Friends") rec("rec-friends", "Agree on a budget up front", "Money mismatches are a common source of friction in groups.", "Settle shared costs and a daily spending expectation before you leave.");
  if (trip.travellerType === "Solo") rec("rec-solo", "Share your plan with someone you trust", "Solo trips are safer with a simple check-in routine.", "Send your itinerary and message once a day.");
  if (!out.some((i) => i.section === "recs")) rec("rec-general", "Keep it simple", "A clear plan with room to breathe usually beats a packed one.", "Choose 1–2 priorities per day.");

  return out;
}
