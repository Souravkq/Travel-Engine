export const LANGUAGES = ["ml", "en", "ta", "hi"] as const;
export type Language = (typeof LANGUAGES)[number];
export const LANGUAGE_LABELS: Record<Language, string> = {
  ml: "Malayalam (മലയാളം)",
  en: "English",
  ta: "Tamil (தமிழ்)",
  hi: "Hindi (हिन्दी)",
};
export const LANGUAGE_NAMES: Record<Language, string> = {
  ml: "Malayalam",
  en: "English",
  ta: "Tamil",
  hi: "Hindi",
};

export const ROAST_LEVELS = ["mild", "medium", "spicy"] as const;
export type RoastLevel = (typeof ROAST_LEVELS)[number];
export const ROAST_LABELS: Record<RoastLevel, string> = {
  mild: "Gentle (Ammavan is in a good mood)",
  medium: "Medium (honest uncle)",
  spicy: "Spicy (full Kerala roast)",
};

export const STYLES = ["Relaxation", "Adventure", "Culture", "Food", "Mixed"] as const;
export type TravelStyle = (typeof STYLES)[number];

export const TRAVELLER_TYPES = ["Solo", "Couple", "Friends", "Family"] as const;
export type TravellerType = (typeof TRAVELLER_TYPES)[number];

export const COMPANION_OPTIONS = [
  "Group walking tours",
  "Cooking classes",
  "Cafés & co-working spots",
  "Day-trip groups",
  "Nature & hiking groups",
  "Cultural workshops",
] as const;

export type Trip = {
  destinations: string; // comma-separated
  startDate: string; // YYYY-MM-DD
  endDate: string;
  style: TravelStyle;
  budgetPerPerson: number; // INR
  estimatedCost: number; // INR per person
  days: number;
  activities: number; // total planned activities
  travelHoursPerDay: number; // average hours in transit per day
  sleepHours: number; // per night
  transfers: number; // total transport changes
  travellerType: TravellerType;
  interests: string;
  language: Language;
  roast: RoastLevel;
  companionPrefs: string[];
};

export type RiskLevel = "Low" | "Moderate" | "High";
export type FactorId = "budget" | "schedule" | "fatigue" | "transport";

export type Factor = {
  id: FactorId;
  name: string;
  score: number; // 0-100
  weight: number; // 0-1
  contribution: number; // score * weight
  level: RiskLevel;
  explanation: string;
};

export type ScoreResult = {
  score: number; // 0-100 integer
  level: RiskLevel;
  factors: Factor[];
  disclaimer: string;
};

export type Mood = "proud" | "amused" | "worried" | "shocked" | "alarmed";
export type AmmavanErrorCode = "not_configured" | "invalid_key" | "rate_limited" | "timeout" | "network" | "bad_response" | "server_error";

export type AmmavanVerdict = {
  headline: string; // short punchy one-liner
  mood: Mood;
  verdict: string;
  topRisks: string[];
  recommendations: string[];
  rescueAdvice?: string;
  soloNote?: string;
};

export type AmmavanResponse = AmmavanVerdict & {
  source: "sarvam" | "fallback";
  reason?: AmmavanErrorCode; // why the offline fallback was used
};

export type Place = {
  id: string;
  name: string;
  category: string;
  reason: string;
  distanceKm?: number;
  mapUrl: string;
  status: "osm-data" | "illustrative";
  sourceNote: string;
};

export type PlacesResponse = {
  places: Place[];
  mode: "live" | "illustrative";
  note: string;
  ammavanComment: string;
  commentSource: "sarvam" | "fallback";
};
