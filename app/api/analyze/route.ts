import { NextResponse } from "next/server";
import { readTrip } from "@/lib/api-helpers";
import { computeScore } from "@/lib/scoring";

export const runtime = "nodejs";

/** Validates the trip and returns the deterministic regret-risk result. No AI involved. */
export async function POST(req: Request) {
  const r = await readTrip(req);
  if (r.error) return r.error;
  return NextResponse.json({ ok: true, trip: r.trip, warnings: r.warnings, result: computeScore(r.trip) });
}
