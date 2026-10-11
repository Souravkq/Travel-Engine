import { NextResponse } from "next/server";
import { readTrip } from "@/lib/api-helpers";
import { buildAlternatives } from "@/lib/alternatives";
import { generateComment } from "@/lib/ammavan";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const r = await readTrip(req);
  if (r.error) return r.error;
  const alt = buildAlternatives(r.trip);
  const rec = alt.plans.find((p) => p.id === alt.recommendedId)!;
  const ammavan = await generateComment("alternatives", r.trip, {
    currentScore: alt.current.score,
    suggestedPlan: rec.name,
    suggestedScore: rec.result.score,
    changes: rec.changes,
  });
  return NextResponse.json({ ok: true, ...alt, ammavan });
}
