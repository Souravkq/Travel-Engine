/** Local discovery. SERVER-ONLY (uses the optional GEOAPIFY_API_KEY). */
import { destinationList } from "./scoring";
import type { Place, Trip } from "./types";

const mapSearch = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const mapPoint = (lat: number, lon: number) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;

type Group = { key: string; label: string; categories: string; reason: string };
const GROUPS: Group[] = [
  { key: "tea", label: "Tea shops & cafés", categories: "catering.cafe", reason: "Listed as a café on OpenStreetMap — a possible spot for a tea break." },
  { key: "nature", label: "Nature spots", categories: "natural", reason: "Listed as a natural feature on OpenStreetMap." },
  { key: "water", label: "Waterfalls & lakes", categories: "natural.water", reason: "Listed as a water feature on OpenStreetMap." },
  { key: "quiet", label: "Quiet places away from crowds", categories: "leisure.park", reason: "Listed as a park or green space on OpenStreetMap." },
  { key: "food", label: "Local food", categories: "catering.restaurant", reason: "Listed as a restaurant on OpenStreetMap." },
  { key: "culture", label: "Cultural experiences", categories: "entertainment.culture", reason: "Listed as a cultural venue on OpenStreetMap." },
];

async function getJson(url: string, ms = 8000): Promise<unknown> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal: c.signal, cache: "no-store" });
    if (!r.ok) throw new Error(`http_${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

type GeoFeature = { properties: { name?: string; lat?: number; lon?: number; distance?: number; place_id?: string } };

export async function livePlaces(trip: Trip): Promise<Place[] | null> {
  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) return null;
  const dest = destinationList(trip)[0];
  try {
    const geo = (await getJson(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(dest)}&limit=1&apiKey=${key}`)) as { features?: { geometry: { coordinates: [number, number] } }[] };
    const coords = geo.features?.[0]?.geometry.coordinates;
    if (!coords) return null;
    const [lon, lat] = coords;
    const wantFood = trip.style === "Food" || /food|eat/i.test(trip.interests);
    const wantCulture = trip.style === "Culture" || /culture|temple|museum|history/i.test(trip.interests);
    const groups = GROUPS.filter((g) => !["food", "culture"].includes(g.key) || (g.key === "food" && wantFood) || (g.key === "culture" && wantCulture));

    const settled = await Promise.allSettled(
      groups.map(async (g) => {
        const url = `https://api.geoapify.com/v2/places?categories=${g.categories}&filter=circle:${lon},${lat},15000&bias=proximity:${lon},${lat}&limit=4&apiKey=${key}`;
        const data = (await getJson(url)) as { features?: GeoFeature[] };
        return { g, features: data.features ?? [] };
      }),
    );
    const places: Place[] = [];
    const seen = new Set<string>();
    for (const s of settled) {
      if (s.status !== "fulfilled") continue;
      for (const f of s.value.features) {
        const p = f.properties;
        if (!p.name || p.lat === undefined || p.lon === undefined || seen.has(p.name.toLowerCase())) continue;
        seen.add(p.name.toLowerCase());
        places.push({
          id: p.place_id ?? `${s.value.g.key}-${places.length}`,
          name: p.name,
          category: s.value.g.label,
          reason: s.value.g.reason,
          distanceKm: typeof p.distance === "number" ? Math.round(p.distance / 100) / 10 : undefined,
          mapUrl: mapPoint(p.lat, p.lon),
          status: "osm-data",
          sourceNote: "OpenStreetMap data via Geoapify. Opening hours, prices and quality are NOT verified.",
        });
        if (places.filter((x) => x.category === s.value.g.label).length >= 2) break;
      }
    }
    return places.length ? places.slice(0, 10) : null;
  } catch (e) {
    console.warn("[places] live lookup failed:", e instanceof Error ? e.message : "unknown");
    return null;
  }
}

/** Category-level ideas with map SEARCH links. They are NOT specific businesses. */
export function illustrativePlaces(trip: Trip): Place[] {
  const dest = destinationList(trip)[0] ?? "your destination";
  const lowBudget = trip.budgetPerPerson / trip.days < 2500;
  const items: { cat: string; name: string; q: string; reason: string; tags: string[] }[] = [
    { cat: "Tea shops & local food", name: "A busy local tea stall or café", q: `tea shop ${dest}`, reason: "A short chai or coffee break between sights is usually the cheapest way to watch daily life.", tags: ["food", "tea", "budget"] },
    { cat: "Tea shops & local food", name: "A small family-run eatery", q: `local restaurant ${dest}`, reason: lowBudget ? "Small local eateries tend to be easier on a tight budget — check recent reviews." : "Look for places with steady local crowds and recent reviews.", tags: ["food", "budget"] },
    { cat: "Hills & viewpoints", name: "A sunrise or sunset viewpoint", q: `viewpoint ${dest}`, reason: "Early or late light usually means fewer people and better views.", tags: ["adventure", "hill", "view", "nature"] },
    { cat: "Nature spots", name: "A nearby nature walk or park", q: `nature park ${dest}`, reason: "A gentle green stop is a good counterweight to a busy itinerary.", tags: ["nature", "relax", "hike"] },
    { cat: "Waterfalls & lakes", name: "A lake or waterfall within day-trip range", q: `waterfall lake near ${dest}`, reason: "Check season and access conditions before going — we can't verify them.", tags: ["nature", "adventure", "water"] },
    { cat: "Hidden neighbourhoods", name: "A residential or old-town neighbourhood walk", q: `old town neighbourhood ${dest}`, reason: "Slow walking in non-tourist areas often shows a place's character.", tags: ["culture", "food"] },
    { cat: "Cultural experiences", name: "A small museum, temple, or craft workshop", q: `cultural experience ${dest}`, reason: "Smaller venues are often less crowded than the headline attractions.", tags: ["culture", "history", "temple"] },
    { cat: "Quiet places away from crowds", name: "A quiet corner outside peak hours", q: `quiet places ${dest}`, reason: "Visiting popular areas early or on weekdays can cut waiting time.", tags: ["relax", "quiet"] },
  ];
  const text = `${trip.style} ${trip.interests}`.toLowerCase();
  const scored = items.map((it, i) => ({ it, s: it.tags.filter((t) => text.includes(t)).length * 2 + (trip.style === "Relaxation" && it.tags.includes("relax") ? 2 : 0) - i * 0.01 }));
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, 6).map(({ it }, i) => ({
    id: `ill-${i}`,
    name: it.name,
    category: it.cat,
    reason: it.reason,
    mapUrl: mapSearch(it.q),
    status: "illustrative" as const,
    sourceNote: "Illustrative idea, not a verified business. The map link opens a search.",
  }));
}
