import { IMAGES } from "./images";
import { computeScore } from "./scoring";
import type { Trip } from "./types";

export const EXAMPLE_FILTERS = ["All", "Solo", "Couples", "Families", "Adventure", "Relaxation", "Food", "Culture"] as const;

type Example = {
  id: string;
  title: string; // card heading
  image: string;
  tags: string[]; // used for filters + chips
  base: Omit<Trip, "startDate" | "endDate">;
};

const common = { language: "ml" as const, roast: "medium" as const, companionPrefs: [] as string[] };

export const EXAMPLES: Example[] = [
  {
    id: "tokyo", title: "7 Days in Tokyo", image: IMAGES.tokyo, tags: ["Solo", "Adventure", "Food", "Culture"],
    base: { destinations: "Tokyo, Japan", style: "Adventure", budgetPerPerson: 150000, estimatedCost: 135000, days: 7, activities: 18, travelHoursPerDay: 2.5, sleepHours: 7.5, transfers: 3, travellerType: "Solo", interests: "street food, temples, nightlife, anime", ...common },
  },
  {
    id: "paris", title: "5 Days in Paris", image: IMAGES.paris, tags: ["Couples", "Culture", "Food"],
    base: { destinations: "Paris, France", style: "Culture", budgetPerPerson: 120000, estimatedCost: 110000, days: 5, activities: 9, travelHoursPerDay: 3, sleepHours: 7.5, transfers: 2, travellerType: "Couple", interests: "museums, cafes, architecture, romance", ...common },
  },
  {
    id: "bali", title: "10 Days in Bali", image: IMAGES.bali, tags: ["Couples", "Relaxation", "Adventure"],
    base: { destinations: "Bali, Indonesia", style: "Relaxation", budgetPerPerson: 90000, estimatedCost: 120000, days: 10, activities: 14, travelHoursPerDay: 2.5, sleepHours: 8, transfers: 4, travellerType: "Couple", interests: "beaches, spas, waterfalls, surfing", ...common },
  },
  {
    id: "newyork", title: "3 Days in New York", image: IMAGES.newyork, tags: ["Solo", "Food", "Culture"],
    base: { destinations: "New York, USA", style: "Food", budgetPerPerson: 80000, estimatedCost: 70000, days: 3, activities: 7, travelHoursPerDay: 3, sleepHours: 7, transfers: 2, travellerType: "Solo", interests: "pizza, museums, skyline views", ...common },
  },
  {
    id: "italy", title: "2 Weeks in Italy", image: IMAGES.italy, tags: ["Families", "Culture", "Food"],
    base: { destinations: "Rome, Florence, Venice", style: "Culture", budgetPerPerson: 250000, estimatedCost: 210000, days: 14, activities: 22, travelHoursPerDay: 3, sleepHours: 8, transfers: 5, travellerType: "Family", interests: "history, gelato, art, boat rides", ...common },
  },
  {
    id: "iceland", title: "1 Week in Iceland", image: IMAGES.iceland, tags: ["Adventure", "Nature"],
    base: { destinations: "Reykjavik, Iceland", style: "Adventure", budgetPerPerson: 180000, estimatedCost: 190000, days: 7, activities: 16, travelHoursPerDay: 4.5, sleepHours: 7, transfers: 4, travellerType: "Friends", interests: "waterfalls, glaciers, northern lights, hot springs", ...common },
  },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Builds a full Trip with dates ~45 days from today so examples never go stale. */
export function exampleToTrip(ex: Example, today = new Date()): Trip {
  const start = new Date(today.getTime() + 45 * 86_400_000);
  const end = new Date(start.getTime() + (ex.base.days - 1) * 86_400_000);
  return { ...ex.base, startDate: iso(start), endDate: iso(end) };
}

/** Illustrative score: computed by the real engine from the example's data. */
export function exampleScore(ex: Example) {
  return computeScore(exampleToTrip(ex, new Date("2027-01-01T00:00:00Z")));
}
