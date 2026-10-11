/** AI Ammavan: persona prompt building + response shaping. SERVER-ONLY. */
import { buildFallbackVerdict, EXTRA, moodFor, T } from "./fallback";
import { errorCodeOf, extractJson, logSarvamIssue, sarvamChat, sarvamConfigured } from "./sarvam";
import { destinationList, inr, SEVERE_SLEEP_MAX } from "./scoring";
import { LANGUAGE_NAMES, type AmmavanResponse, type Language, type Mood, type RoastLevel, type ScoreResult, type Trip } from "./types";

const MOODS: Mood[] = ["proud", "amused", "worried", "shocked", "alarmed"];

const LANGUAGE_RULES: Record<Language, string> = {
  ml: "Write in natural, colloquial Kerala Malayalam, in Malayalam script. Mix in everyday English words written in English letters (Manglish) where a real Malayali would: plan, budget, trip, sightseeing, ticket, recovery leave, relax. Sound like an uncle talking over chaya, NOT like a textbook translation. Use address words such as 'മോനേ', 'ഡാ', 'എന്റെ പൊന്നേ' sparingly.",
  en: "Write in natural, punchy English with a Kerala-uncle flavour (a little 'mone', 'da', 'enthu parayana' is fine). Direct, funny, never corporate.",
  ta: "Write in natural, conversational Tamil in Tamil script, with the same Kerala-uncle personality (a light 'மோனே' is fine). Colloquial, not formal textbook Tamil.",
  hi: "Write in natural, conversational Hindi in Devanagari script (casual 'बेटा', 'अरे'), with the same Kerala-uncle personality. Colloquial, not formal textbook Hindi.",
};

const ROAST_RULES: Record<RoastLevel, string> = {
  mild: "Roast intensity: GENTLE. Teasing, affectionate, more advice than roast.",
  medium: "Roast intensity: MEDIUM. Honest, clearly funny, with a few sharp jokes.",
  spicy: "Roast intensity: SPICY. Full dramatic Kerala-uncle roast, still about the plan, never about the person's identity.",
};

// Cultural flavours for variety. A few are picked at random each call so replies don't sound identical.
const FLAVOURS = [
  "chaya and parippuvada breaks", "KSRTC bus timings", "Kochi traffic", "a sadya on a banana leaf", "an auto-rickshaw chettan's meter",
  "monsoon rain at the worst moment", "the family WhatsApp group commenting on the plan", "a Gulf-returnee uncle's 'in my time' stories",
  "bakery puffs and sulaimani", "a houseboat that never leaves on time", "Munnar fog ruining photos", "an overpacked Onam-season train",
  "a hartal day nobody planned for", "coconut water at every bus stop",
];
const pick = <T,>(arr: T[], n: number) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

const PERSONA = `You are AI Ammavan: a funny, expressive, brutally honest Kerala travel uncle who lives INSIDE a trip-analysis dashboard. You are not a chatbot and never ask questions back.
Hard rules:
- Roast the PLAN, never the person. No abuse, no stereotypes, nothing discriminatory or sexual.
- The risk score and factor numbers come from a deterministic engine. Never change, recompute or contradict them; explain them.
- Use ONLY the facts supplied. Never invent trip details, weather, prices, opening hours, business names, addresses, safety guarantees or availability. Present advice as general suggestions, not verified facts.
- Be specific: refer to the actual numbers (budget gap, activities per day, sleep, transit hours, transfers) and give concrete fixes.
- Short, punchy verdict first, then genuinely useful explanation. Humour AND practical safety.
- Vary your openings; never reuse stock phrases or the example lines in this prompt. Do not mention that you are an AI model.
- If sleep is very low (3 hours or less) or zero, say clearly that this is a real safety concern (alertness, driving, health) before joking, and tell them to fix it first.
Tone examples (style only, never copy): "this plan needs a recovery leave, not a trip", "budget like this and you'll be pricing the ticket home".`;

type Facts = ReturnType<typeof factsFor>;
function factsFor(trip: Trip, result: ScoreResult) {
  const perDay = Math.round((trip.activities / trip.days) * 10) / 10;
  return {
    destinations: destinationList(trip),
    days: trip.days,
    dates: `${trip.startDate} to ${trip.endDate}`,
    style: trip.style,
    travellerType: trip.travellerType,
    interests: trip.interests || "not specified",
    estimatedCost: inr(trip.estimatedCost),
    referenceBudget: inr(trip.budgetPerPerson),
    budgetNote: "The user was not asked for a budget; this is a reference budget used for comparison, so don't claim they 'set' it.",
    overReferenceBudgetBy: trip.estimatedCost > trip.budgetPerPerson ? inr(trip.estimatedCost - trip.budgetPerPerson) : null,
    activitiesTotal: trip.activities,
    activitiesPerDay: perDay,
    sleepHoursPerNight: trip.sleepHours,
    zeroSleep: trip.sleepHours === 0,
    severelyLowSleep: trip.sleepHours <= SEVERE_SLEEP_MAX,
    travelHoursPerDay: trip.travelHoursPerDay,
    transportChanges: trip.transfers,
    score: result.score,
    riskLevel: result.level,
    factors: result.factors.map((f) => ({ name: f.name, score: f.score, weightPct: Math.round(f.weight * 100), level: f.level, why: f.explanation })),
  };
}

const s = (v: unknown, max = 600) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function generateVerdict(trip: Trip, result: ScoreResult): Promise<AmmavanResponse> {
  const fallback = buildFallbackVerdict(trip, result);
  if (!sarvamConfigured()) return { ...fallback, source: "fallback", reason: "not_configured" };

  const system = `${PERSONA}
${LANGUAGE_RULES[trip.language]}
${ROAST_RULES[trip.roast]}
For flavour you MAY lean on: ${pick(FLAVOURS, 3).join("; ")}. Use at most one or two, only if natural.
Reply with ONLY a JSON object (no markdown) in the ${LANGUAGE_NAMES[trip.language]} language, with this schema:
{"headline": string (max 12 words, the punchy one-line verdict),
 "mood": one of "proud" | "amused" | "worried" | "shocked" | "alarmed" (your reaction: proud=sensible plan, amused=minor issues, worried=high risk, shocked=extreme, alarmed=zero/near-zero sleep),
 "verdict": string (3-5 sentences: the roast plus a clear explanation of the biggest detected risks, using the real numbers),
 "topRisks": string[] (max 3, one short sentence each, based only on the detected factors),
 "recommendations": string[] (EXACTLY 3 specific, practical fixes tied to the numbers, each 1-2 sentences),
 "rescueAdvice": string (only when riskLevel is High: how to rescue the plan; else ""),
 "soloNote": string (only when travellerType is Solo: a short tip about joining public group activities and staying safe; else "")}`;
  const user = JSON.stringify(factsFor(trip, result) satisfies Facts);

  try {
    const parsed = extractJson(await sarvamChat(system, user)) as Record<string, unknown> | null;
    const verdict = s(parsed?.verdict, 1200);
    if (!parsed || !verdict) throw Object.assign(new Error("bad_response"), { code: "bad_response" });
    const recs = Array.isArray(parsed.recommendations) ? parsed.recommendations.map((r) => s(r, 400)).filter(Boolean) : [];
    const risks = Array.isArray(parsed.topRisks) ? parsed.topRisks.map((r) => s(r, 300)).filter(Boolean) : [];
    const mood = MOODS.includes(parsed.mood as Mood) ? (parsed.mood as Mood) : moodFor(trip, result);
    return {
      headline: s(parsed.headline, 140) || EXTRA[trip.language].headline[result.level],
      // Safety: the mood can't be happier than the data allows (zero sleep is always "alarmed").
      mood: trip.sleepHours === 0 ? "alarmed" : mood,
      verdict,
      topRisks: (risks.length ? risks : fallback.topRisks).slice(0, 3),
      recommendations: [...recs, ...fallback.recommendations].slice(0, 3),
      rescueAdvice: result.level === "High" ? s(parsed.rescueAdvice, 500) || fallback.rescueAdvice : undefined,
      soloNote: trip.travellerType === "Solo" ? s(parsed.soloNote, 500) || fallback.soloNote : undefined,
      source: "sarvam",
    };
  } catch (e) {
    logSarvamIssue("verdict", e);
    return { ...fallback, source: "fallback", reason: errorCodeOf(e) };
  }
}

/** Short contextual comment (alternatives / places). Falls back to a localized line if AI is unavailable. */
export async function generateComment(
  kind: "alternatives" | "places",
  trip: Trip,
  context: unknown,
): Promise<{ comment: string; source: "sarvam" | "fallback" }> {
  const fb = { comment: kind === "alternatives" ? T[trip.language].alt : T[trip.language].places, source: "fallback" as const };
  if (!sarvamConfigured()) return fb;
  const task =
    kind === "alternatives"
      ? "Explain, with one roast-style joke and one practical tip, WHY the suggested plan is better than the current one, referring to the actual changes and the before/after scores supplied. Max 3 sentences."
      : "Comment briefly on these local suggestions for the traveller's interests. Remind them these are general ideas and to verify timings and reviews. Do not add any place names or facts that are not in the data. Max 3 sentences.";
  const system = `${PERSONA}
${LANGUAGE_RULES[trip.language]}
${ROAST_RULES[trip.roast]}
Task: ${task}
Reply with ONLY JSON in the ${LANGUAGE_NAMES[trip.language]} language: {"comment": string}`;
  const brief = { destinations: destinationList(trip), days: trip.days, style: trip.style, travellerType: trip.travellerType, interests: trip.interests || "not specified" };
  try {
    const parsed = extractJson(await sarvamChat(system, JSON.stringify({ trip: brief, data: context }), { maxTokens: 1500 })) as Record<string, unknown> | null;
    const comment = s(parsed?.comment, 800);
    if (!comment) throw new Error("bad_response");
    return { comment, source: "sarvam" };
  } catch (e) {
    logSarvamIssue(kind, e);
    return fb;
  }
}
