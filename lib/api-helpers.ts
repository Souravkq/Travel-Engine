import { NextResponse } from "next/server";
import { validateTrip } from "@/lib/validation";

const MAX_BODY = 20_000; // bytes - reject oversized payloads

/** Reads and validates `{ trip }` from a request body. */
export async function readTrip(req: Request) {
  let text: string;
  try {
    text = await req.text();
  } catch {
    return { error: NextResponse.json({ ok: false, errors: { _form: "Could not read request." } }, { status: 400 }) };
  }
  if (text.length > MAX_BODY) return { error: NextResponse.json({ ok: false, errors: { _form: "Request too large." } }, { status: 413 }) };
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { error: NextResponse.json({ ok: false, errors: { _form: "Invalid JSON." } }, { status: 400 }) };
  }
  const v = validateTrip((body as { trip?: unknown } | null)?.trip);
  if (!v.ok) return { error: NextResponse.json({ ok: false, errors: v.errors }, { status: 400 }) };
  return { trip: v.trip, warnings: v.warnings };
}
