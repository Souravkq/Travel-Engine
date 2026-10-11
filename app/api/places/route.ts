import { NextResponse } from "next/server";
import { readTrip } from "@/lib/api-helpers";
import { generateComment } from "@/lib/ammavan";
import { illustrativePlaces, livePlaces } from "@/lib/places";
import type { PlacesResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const r = await readTrip(req);
  if (r.error) return r.error;
  const live = await livePlaces(r.trip);
  const places = live ?? illustrativePlaces(r.trip);
  const mode = live ? "live" : "illustrative";
  const c = await generateComment("places", r.trip, places.map((p) => ({ name: p.name, category: p.category, status: p.status })));
  const body: PlacesResponse = {
    places,
    mode,
    note: live
      ? "Places come from OpenStreetMap data via Geoapify. Opening hours, prices and quality are not verified."
      : "No places provider is configured (or it returned nothing), so these are illustrative ideas — not verified businesses. Map links open a search.",
    ammavanComment: c.comment,
    commentSource: c.source,
  };
  return NextResponse.json({ ok: true, ...body });
}
