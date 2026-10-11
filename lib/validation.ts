import { DEFAULT_DAILY_BUDGET } from "./scoring";
import {
  COMPANION_OPTIONS,
  LANGUAGES,
  ROAST_LEVELS,
  STYLES,
  TRAVELLER_TYPES,
  type Language,
  type RoastLevel,
  type TravelStyle,
  type TravellerType,
  type Trip,
} from "./types";

export type ValidationResult =
  | { ok: true; trip: Trip; warnings: string[] }
  | { ok: false; errors: Record<string, string> };

// Sensible limits - anything outside is rejected as unreasonable.
export const LIMITS = {
  budget: [500, 5_000_000],
  cost: [100, 50_000_000],
  days: [1, 60],
  activities: [0, 200],
  travelHours: [0, 18],
  sleep: [0, 12], // 0 is allowed: zero sleep is scored as a severe fatigue risk
  transfers: [0, 60],
} as const;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const clean = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, max);

function num(
  raw: Record<string, unknown>,
  key: string,
  label: string,
  [min, max]: readonly [number, number],
  errors: Record<string, string>,
  opts: { integer?: boolean; unit?: string } = {},
): number {
  const v = raw[key];
  if (v === "" || v === null || v === undefined) {
    errors[key] = `${label} is required.`;
    return NaN;
  }
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  if (!Number.isFinite(n)) {
    errors[key] = `${label} must be a number.`;
    return NaN;
  }
  if (n < 0) {
    errors[key] = `${label} cannot be negative.`;
    return NaN;
  }
  if (opts.integer && !Number.isInteger(n)) {
    errors[key] = `${label} must be a whole number.`;
    return NaN;
  }
  if (n < min || n > max) {
    const u = opts.unit ? ` ${opts.unit}` : "";
    errors[key] = `${label} should be between ${min.toLocaleString("en-IN")} and ${max.toLocaleString("en-IN")}${u}.`;
    return NaN;
  }
  return n;
}

function dateOk(s: string) {
  if (!ISO.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
export function daysBetween(start: string, end: string) {
  const ms = new Date(end + "T00:00:00Z").getTime() - new Date(start + "T00:00:00Z").getTime();
  return Math.round(ms / 86_400_000) + 1;
}

/** Validates untrusted input (from the form or API) and returns a clean Trip. */
export function validateTrip(input: unknown): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, errors: { _form: "Trip details are missing or malformed." } };
  }
  const raw = input as Record<string, unknown>;

  const destinations = clean(raw.destinations, 200);
  if (!destinations) errors.destinations = "Please enter at least one destination.";
  else if (destinations.split(/[,;\n→>]+/).filter((d) => d.trim()).length > 8)
    errors.destinations = "Please list at most 8 destinations.";

  const startDate = clean(raw.startDate, 10);
  const endDate = clean(raw.endDate, 10);
  if (!dateOk(startDate)) errors.startDate = "Enter a valid start date.";
  if (!dateOk(endDate)) errors.endDate = "Enter a valid end date.";
  if (!errors.startDate && !errors.endDate && endDate < startDate)
    errors.endDate = "End date can't be before the start date.";

  const style = clean(raw.style, 20) as TravelStyle;
  if (!STYLES.includes(style)) errors.style = "Choose a travel style.";
  const travellerType = clean(raw.travellerType, 20) as TravellerType;
  if (!TRAVELLER_TYPES.includes(travellerType)) errors.travellerType = "Choose who is travelling.";
  const roast = (clean(raw.roast, 10) || "medium") as RoastLevel;
  if (!ROAST_LEVELS.includes(roast)) errors.roast = "Choose a roast level.";
  const language = (clean(raw.language, 5) || "ml") as Language;
  if (!LANGUAGES.includes(language)) errors.language = "Choose a supported language.";

  const estimatedCost = num(raw, "estimatedCost", "Estimated cost", LIMITS.cost, errors, { unit: "INR" });

  // Days are DERIVED from the dates unless explicitly provided (older saved trips).
  const hasDays = raw.days !== undefined && raw.days !== null && raw.days !== "";
  let days: number;
  if (hasDays) days = num(raw, "days", "Number of days", LIMITS.days, errors, { integer: true });
  else if (!errors.startDate && !errors.endDate) {
    days = daysBetween(startDate, endDate);
    if (days > LIMITS.days[1]) {
      errors.endDate = `Trips longer than ${LIMITS.days[1]} days aren't supported. Shorten the date range.`;
      days = NaN;
    }
  } else days = NaN;

  // Budget is no longer asked. Use a provided reference if present, else days x default daily budget.
  const hasBudget = raw.budgetPerPerson !== undefined && raw.budgetPerPerson !== null && raw.budgetPerPerson !== "";
  let budgetPerPerson: number;
  if (hasBudget) budgetPerPerson = num(raw, "budgetPerPerson", "Reference budget", LIMITS.budget, errors, { unit: "INR" });
  else budgetPerPerson = Number.isFinite(days) ? Math.max(LIMITS.budget[0], Math.round(days * DEFAULT_DAILY_BUDGET)) : NaN;
  const activities = num(raw, "activities", "Planned activities", LIMITS.activities, errors, { integer: true });
  const travelHoursPerDay = num(raw, "travelHoursPerDay", "Travel hours per day", LIMITS.travelHours, errors, { unit: "hours" });
  const sleepHours = num(raw, "sleepHours", "Sleep hours", LIMITS.sleep, errors, { unit: "hours" });
  const transfers = num(raw, "transfers", "Transport changes", LIMITS.transfers, errors, { integer: true });

  if (Object.keys(errors).length) return { ok: false, errors };

  const span = daysBetween(startDate, endDate);
  if (hasDays && span !== days) warnings.push(`Your dates span ${span} day(s) but the trip uses ${days}.`);
  if (sleepHours <= 3) warnings.push("Very little sleep is rated as a severe fatigue risk.");
  if (activities > days * 8) warnings.push("That is a very large number of activities per day.");

  const prefsRaw = Array.isArray(raw.companionPrefs) ? raw.companionPrefs : [];
  const companionPrefs = prefsRaw
    .map((p) => clean(p, 40))
    .filter((p) => (COMPANION_OPTIONS as readonly string[]).includes(p))
    .slice(0, 10);

  return {
    ok: true,
    warnings,
    trip: {
      destinations,
      startDate,
      endDate,
      style,
      budgetPerPerson,
      estimatedCost,
      days,
      activities,
      travelHoursPerDay,
      sleepHours,
      transfers,
      travellerType,
      interests: clean(raw.interests, 300),
      language,
      roast,
      companionPrefs,
    },
  };
}
