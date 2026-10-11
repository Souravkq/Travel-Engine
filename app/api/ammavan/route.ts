import { NextResponse } from "next/server";
import { readTrip } from "@/lib/api-helpers";
import { generateVerdict } from "@/lib/ammavan";
import { computeScore } from "@/lib/scoring";
import { sarvamStatus } from "@/lib/sarvam";

export const runtime = "nodejs";

/** Diagnostics: is the server configured? Never returns the key. */
export async function GET() {
  return NextResponse.json({ ok: true, ...sarvamStatus() });
}

/**
 * AI Ammavan verdict. The score is recomputed on the server from the validated
 * trip, so neither the browser nor the LLM can supply or overwrite it.
 * Always returns 200 with an offline verdict + a machine-readable `reason` if Sarvam fails.
 */
export async function POST(req: Request) {
  const r = await readTrip(req);
  if (r.error) return r.error;
  const result = computeScore(r.trip);
  const ammavan = await generateVerdict(r.trip, result);
  return NextResponse.json({ ok: true, result, ammavan });
}
