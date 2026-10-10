import OpenAI from "openai";
import { NextResponse } from "next/server";


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type TripInput = {
  destination: string;
  budget: number;
  estimatedCost: number;
  days: number;
  activities: number;
  sleepHours: number;
  travelHours: number;
  transportChanges: number;
  brutalMode: boolean;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function calculateRisks(trip: TripInput) {
  
    const budgetRisk =
        trip.estimatedCost <= trip.budget
            ? clamp((trip.estimatedCost / trip.budget) * 35)
            : clamp(
                50 +
                ((trip.estimatedCost - trip.budget) / trip.budget) * 50
            );


  const activityCapacity = trip.days * 3;
  const scheduleRisk = clamp(
    ((trip.activities - activityCapacity) / Math.max(activityCapacity, 1)) * 65
  );

  const fatigueRisk = clamp(
    (8 - trip.sleepHours) * 12 +
      Math.max(0, trip.travelHours - trip.days * 2) * 5
  );

  const transportRisk = clamp(trip.transportChanges * 18);

  // Weather is not supplied by a live weather service in this MVP.
  // Keep it out of the score until reliable weather data is integrated.
  const weights = [
    { key: "Budget pressure", score: budgetRisk, weight: 0.35 },
    { key: "Schedule overload", score: scheduleRisk, weight: 0.30 },
    { key: "Travel fatigue", score: fatigueRisk, weight: 0.22 },
    { key: "Transport complexity", score: transportRisk, weight: 0.13 },
  ];

  const score = Math.round(
    weights.reduce((sum, item) => sum + item.score * item.weight, 0)
  );

  const risks = weights.map((item) => ({
    name: item.key,
    score: Math.round(item.score),
    contribution: Math.round(item.score * item.weight),
    weight: item.weight,
    level:
      item.score >= 65 ? "High" :
      item.score >= 35 ? "Moderate" : "Low",
  }));

  return {
    score,
    risks,
    level:
      score >= 70 ? "HIGH RISK" :
      score >= 40 ? "MODERATE RISK" : "LOWER RISK",
  };
}

function fallbackRoast(score: number, risks: ReturnType<typeof calculateRisks>["risks"], brutal: boolean) {
  const worst = [...risks].sort((a, b) => b.score - a.score)[0];

  if (score >= 70) {
    return brutal
      ? `Bro, your itinerary is fighting for its life. ${worst.name} is the biggest problem. Fix that before your wallet and your sleep file a complaint.`
      : `Your trip has several pressure points. Start by addressing ${worst.name.toLowerCase()} before you travel.`;
  }

  if (score >= 40) {
    return brutal
      ? `This trip might work, but ${worst.name.toLowerCase()} could ruin the vibe. Give yourself some breathing room.`
      : `Your plan looks manageable with some adjustments. Focus first on ${worst.name.toLowerCase()}.`;
  }

  return brutal
    ? "Suspiciously sensible. You may actually return with money, energy and good memories."
    : "Your plan looks relatively balanced. Leave some flexibility for unexpected changes.";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TripInput;

    const destination =
      typeof body.destination === "string"
        ? body.destination.trim().slice(0, 100)
        : "";

    const trip: TripInput = {
      destination,
      budget: Number(body.budget),
      estimatedCost: Number(body.estimatedCost),
      days: Number(body.days),
      activities: Number(body.activities),
      sleepHours: Number(body.sleepHours),
      travelHours: Number(body.travelHours),
      transportChanges: Number(body.transportChanges),
      brutalMode: body.brutalMode === true,
    };

    if (
      !trip.destination ||
      !Number.isFinite(trip.budget) ||
      !Number.isFinite(trip.estimatedCost) ||
      !Number.isFinite(trip.days) ||
      !Number.isFinite(trip.activities) ||
      !Number.isFinite(trip.sleepHours) ||
      !Number.isFinite(trip.travelHours) ||
      !Number.isFinite(trip.transportChanges) ||
      trip.budget < 1 ||
      trip.estimatedCost < 0 ||
      trip.days < 1 ||
      trip.days > 60 ||
      trip.activities < 0 ||
      trip.activities > 180 ||
      trip.sleepHours < 0 ||
      trip.sleepHours > 24 ||
      trip.travelHours < 0 ||
      trip.travelHours > 1000 ||
      trip.transportChanges < 0 ||
      trip.transportChanges > 30
    ) {
      return NextResponse.json(
        { error: "Please enter valid trip details." },
        { status: 400 }
      );
    }

    const result = calculateRisks(trip);
    let roast = fallbackRoast(
      result.score,
      result.risks,
      trip.brutalMode
    );
    let aiUsed = false;

    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await openai.responses.create({
          model: process.env.OPENAI_MODEL || "gpt-5.5",
          instructions: [
            "You are Travel Regret Engine, a witty but helpful travel risk analyst.",
            "Explain the supplied score and risk factors; never change the score.",
            "Do not claim that this heuristic is a scientifically validated probability.",
            "Do not invent live weather, traffic, prices or destination facts.",
            trip.brutalMode
              ? "Use playful, sharp roast humour without insulting protected traits."
              : "Be friendly, direct and constructive.",
            "Return a short verdict, the main risk and two practical suggestions.",
            "Keep the entire response under 110 words.",
          ].join(" "),
          input: JSON.stringify({
            destination: trip.destination,
            budget: trip.budget,
            estimatedCost: trip.estimatedCost,
            days: trip.days,
            activities: trip.activities,
            sleepHours: trip.sleepHours,
            travelHours: trip.travelHours,
            transportChanges: trip.transportChanges,
            score: result.score,
            level: result.level,
            risks: result.risks,
          }),
        });

        if (response.output_text.trim()) {
          roast = response.output_text.trim();
          aiUsed = true;
        }
      } catch (error) {
        console.error("AI request failed; using fallback.", error);
      }
    }

    return NextResponse.json({
      ...result,
      roast,
      aiUsed,
      destination: trip.destination,
      disclaimer:
        "This is an illustrative heuristic risk score, not a validated probability of regret. Weather and live travel conditions are not included.",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not analyse this trip. Please try again." },
      { status: 400 }
    );
  }
}
