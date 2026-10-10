"use client";



import { useState } from "react";



type Risk = { name: string; score: number; contribution: number; level: string };

type Analysis = {

  score: number;

  level: string;

  risks: Risk[];

  roast: string;

  aiUsed: boolean;

  destination: string;

  disclaimer: string;

};

type Trip = {

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

type ScheduleDay = { day: number; title: string; activities: string[] };

type Plan = Trip & {

  title: string;

  summary: string;

  schedule: ScheduleDay[];

  recommendations: string[];

};

type ViewResult = { analysis: Analysis; plan?: Plan; kind: "original" | "automatic" | "alternative"; explanation?: string };



const initialTrip: Trip = {

  destination: "Goa", budget: 5000, estimatedCost: 8500, days: 2,

  activities: 8, sleepHours: 4, travelHours: 12, transportChanges: 3,

  brutalMode: true,

};



const money = (amount: number) => new Intl.NumberFormat("en-IN", {

  style: "currency", currency: "INR", maximumFractionDigits: 0,

}).format(Number.isFinite(amount) ? amount : 0);



async function readJson(response: Response) {

  const data = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);

  return data;

}



async function requestAnalysis(trip: Trip): Promise<Analysis> {

  const response = await fetch("/api/analyze", {

    method: "POST",

    headers: {

      "Content-Type": "application/json",

    },

    body: JSON.stringify(trip),

  });

  return readJson(response);

}



async function requestAmmavan(trip: Trip, message: string): Promise<string> {

  const response = await fetch("/api/ammavan", {

    method: "POST", headers: { "Content-Type": "application/json" },

    body: JSON.stringify({

      message,

      language: "English with occasional natural Malayalam expressions",

      roastLevel: trip.brutalMode ? "high" : "medium",

      tripContext: trip,

    }),

  });

  const data = await readJson(response);

  if (!data.reply || typeof data.reply !== "string") throw new Error("AI Ammavan returned an empty reply. Check your API route and Sarvam API key.");

  return data.reply;

}



function parsePlan(text: string, fallback: Trip): Plan {

  const cleaned = text.replace(/```(?:json)?/gi, "").trim();

  const start = cleaned.indexOf("{");

  const end = cleaned.lastIndexOf("}");

  if (start < 0 || end <= start) throw new Error("Ammavan couldn't format the alternative plan. Please try again.");

  const raw = JSON.parse(cleaned.slice(start, end + 1));

  const n = (value: unknown, backup: number) => {

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : backup;

  };

  const days = Math.max(1, Math.min(30, Math.round(n(raw.days, fallback.days))));

  const schedule: ScheduleDay[] = Array.isArray(raw.schedule) ? raw.schedule.slice(0, days).map((d: any, i: number) => ({

    day: Math.max(1, Math.round(n(d?.day, i + 1))),

    title: String(d?.title || `Day ${i + 1}`),

    activities: Array.isArray(d?.activities) ? d.activities.map(String).slice(0, 8) : [],

  })) : [];

  return {

    title: String(raw.title || "A More Sensible Escape"),

    destination: String(raw.destination || fallback.destination),

    summary: String(raw.summary || "A slower, more realistic version of your trip."),

    budget: Math.max(1, n(raw.budget, fallback.budget)),

    estimatedCost: Math.max(0, n(raw.estimatedCost, fallback.budget)),

    days,

    activities: Math.max(0, Math.round(n(raw.activities, Math.min(fallback.activities, days * 2)))),

    sleepHours: Math.max(0, Math.min(12, n(raw.sleepHours, 8))),

    travelHours: Math.max(0, n(raw.travelHours, fallback.travelHours)),

    transportChanges: Math.max(0, Math.round(n(raw.transportChanges, 1))),

    brutalMode: fallback.brutalMode,

    schedule,

    recommendations: Array.isArray(raw.recommendations) ? raw.recommendations.map(String).slice(0, 8) : [],

  };

}



function buildAutomaticPlan(trip: Trip): Plan {

  const days = Math.max(1, Math.min(30, Math.max(trip.days, Math.ceil(Math.max(1, trip.activities) / 3))));

  const activities = Math.max(1, Math.min(trip.activities, days * 3));

  const budget = Math.max(1, trip.budget);

  const estimatedCost = Math.min(Math.max(0, trip.estimatedCost), budget);

  const schedule: ScheduleDay[] = Array.from({ length: days }, (_, i) => ({

    day: i + 1,

    title: ["Arrive & settle in", "Explore without rushing", "Slow morning & return"][i % 3],

    activities: i === 0

      ? ["Reach the stay and check in", "Have a relaxed local meal", "Choose one nearby highlight"]

      : i === days - 1

      ? ["Have breakfast without rushing", "Visit one nearby spot if time allows", "Keep a buffer for the return journey"]

      : ["Start after a proper night's sleep", "Visit one or two nearby attractions", "Leave free time for food and rest"],

  }));

  return {

    ...trip,

    title: "Automatic Rescue Plan",

    destination: trip.destination.trim() || "Your destination",

    summary: "A conservative, rule-based reset: fewer activities, more sleep, less transfer chaos, and a cost target capped at your stated budget. Verify actual prices before booking.",

    budget,

    estimatedCost,

    days,

    activities,

    sleepHours: Math.max(7, trip.sleepHours),

    travelHours: Math.max(0, Math.min(trip.travelHours, days * 5)),

    transportChanges: Math.min(1, trip.transportChanges),

    schedule,

    recommendations: [

      "Keep one main activity and a nearby optional activity per day.",

      "Reserve a buffer for traffic, check-in, meals, and delays.",

      "Check current transport, stay, entry-fee, and meal prices before confirming.",

      "Treat the cost figure as a planning target, not a live quote.",

    ],

  };

}



const alternativePrompt = (trip: Trip) => `Create a practical alternative trip plan as valid JSON only. Do not use markdown fences and do not include text outside JSON. Keep the destination the same if practical; if it is clearly unsuitable for the budget, suggest a nearby/cheaper alternative and explain it in summary. Use realistic planning estimates, but do not pretend you checked live prices or availability. Keep the estimatedCost at or below the user's budget if reasonably possible; if impossible, say so clearly in summary and use a realistic estimate. Avoid packing too many activities into one day.

Original trip: ${JSON.stringify(trip)}

Return this schema exactly:

{

  "title":"Short plan title",

  "destination":"Destination name",

  "summary":"2-3 useful sentences including key trade-offs and cost uncertainty",

  "budget":5000,

  "estimatedCost":4500,

  "days":2,

  "activities":4,

  "sleepHours":8,

  "travelHours":6,

  "transportChanges":1,

  "schedule":[{"day":1,"title":"Day title","activities":["specific activity","meal/rest idea","optional nearby activity"]}],

  "recommendations":["practical recommendation"]

}

Include one schedule object for each day, with 2-4 activity strings. Keep the tone practical and the details internally consistent.`;



const longVerdictPrompt = (trip: Trip, plan: Plan, analysis: Analysis) => `You are AI Ammavan: a funny, expressive, slightly dramatic, street-smart Malayali uncle who cares about the traveller but refuses to let them make foolish plans. Talk directly to the traveller, like a real person, with personality and warmth. You may use a few natural Malayalam expressions such as "mone", "eda", "sheri", "ithu venda", or "nalla idea" where they fit, but keep the explanation understandable in English. Avoid repeating the same catchphrases.



Write a substantial, useful verdict of around 180-250 words. Do not be brief. Use clear paragraphs and these headings:

1. AMMAVAN'S OPENING ROAST

2. WHY THIS PLAN IS BETTER

3. BUDGET REALITY

4. DAY-BY-DAY ADVICE

5. FINAL VERDICT



Original trip: ${JSON.stringify(trip)}

Rescue plan: ${JSON.stringify(plan)}

Calculated regret score for the rescue plan: ${analysis.score}/100 (${analysis.level}).



Explain what has improved: cost control, pacing, sleep, travel hours, transfers, and activity load, but only when the supplied numbers support that claim. Mention the destination and specific schedule items. Give practical advice, not just jokes. The cost is an estimate and is NOT verified against live prices; explicitly remind the traveller to check tickets, accommodation, local transport, entry fees, weather, and opening times. Do not invent reservations, exact current prices, travel times, or availability. Keep the roast playful, not insulting. Return plain text only, not JSON.`;



export default function Home() {

  const [trip, setTrip] = useState<Trip>(initialTrip);

  const [view, setView] = useState<ViewResult | null>(null);

  const [loading, setLoading] = useState<"" | "analyse" | "automatic" | "alternative">("");

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState("");
  const [voiceAudio, setVoiceAudio] = useState<HTMLAudioElement | null>(null);

  async function speakMalayalam(text: string) {
    const cleanedText = text.trim();
    if (!cleanedText) {
      setVoiceNotice("There is no verdict text to speak yet.");
      return;
    }

    voiceAudio?.pause();
    setVoiceAudio(null);
    setVoicePlaying(false);
    setVoiceNotice("Generating Malayalam voice...");

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanedText, languageCode: "ml-IN" }),
      });
      const data = await response.json();
      if (!response.ok || typeof data.audioBase64 !== "string") {
        throw new Error(data.error || "Could not generate Malayalam audio.");
      }

      const binary = window.atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const audioUrl = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
      const audio = new Audio(audioUrl);
      setVoiceAudio(audio);
      audio.onplay = () => {
        setVoicePlaying(true);
        setVoiceNotice("");
      };
      audio.onended = () => {
        setVoicePlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setVoicePlaying(false);
        setVoiceNotice("Audio playback failed. Try again.");
        URL.revokeObjectURL(audioUrl);
      };
      await audio.play();
    } catch (error) {
      setVoicePlaying(false);
      setVoiceNotice(error instanceof Error ? error.message : "Malayalam voice generation failed.");
    }
  }

  function stopVoice() {
    if (voiceAudio) {
      voiceAudio.pause();
      voiceAudio.currentTime = 0;
    }
    setVoiceAudio(null);
    setVoicePlaying(false);
    setVoiceNotice("");
  }

  function update<K extends keyof Trip>(key: K, value: Trip[K]) {

    setTrip((old) => ({ ...old, [key]: value }));

  }



  async function analyse() {

    setLoading("analyse"); setError(""); setNotice("");

    try {

      const analysis = await requestAnalysis(trip);

      let roast = analysis.roast;

      let aiUsed = analysis.aiUsed;

      try {

        roast = await requestAmmavan(trip, `Give a lively but useful first verdict on this travel plan. Use around 120-170 words, with a funny opening roast, the biggest practical risks, and 2-3 specific fixes. Speak as AI Ammavan, a dramatic but caring Malayali uncle. Use occasional natural Malayalam expressions, not too many. Do not invent facts or live prices. Trip: ${JSON.stringify(trip)}. Regret score: ${analysis.score}/100 (${analysis.level}). Return plain text.`);

        aiUsed = true;

      } catch {

        // The numerical analysis still works if the persona API is temporarily unavailable.

      }

      setView({ analysis: { ...analysis, roast, aiUsed }, kind: "original" });

      if (!aiUsed) setNotice("The score engine worked, but AI Ammavan could not connect. Check /api/ammavan and your Sarvam API key to enable the full persona.");

    } catch (err) {

      setError(err instanceof Error ? err.message : "Analysis failed.");

    } finally { setLoading(""); }

  }



  async function automaticRescue() {

    setLoading("automatic"); setError(""); setNotice("");

    try {

      const plan = buildAutomaticPlan(trip);

      const analysis = await requestAnalysis(plan);

      let explanation = "Ammavan is temporarily unavailable. This automatic plan uses simple rules to reduce overload, but verify all real costs and travel details before booking.";

      try {

        explanation = await requestAmmavan(plan, longVerdictPrompt(trip, plan, analysis));

      } catch (err) {

        setNotice(err instanceof Error ? `Automatic plan is ready, but Ammavan could not speak: ${err.message}` : "Automatic plan is ready, but AI Ammavan is unavailable.");

      }

      setView({ analysis, plan, kind: "automatic", explanation });

    } catch (err) {

      setError(err instanceof Error ? err.message : "Could not create the automatic rescue plan.");

    } finally { setLoading(""); }

  }



  async function alternativeRescue() {

    setLoading("alternative"); setError(""); setNotice("");

    try {

      const raw = await requestAmmavan(trip, alternativePrompt(trip));

      const plan = parsePlan(raw, trip);

      const analysis = await requestAnalysis(plan);

      let explanation = "Alternative plan generated. Verify all prices, transport, weather, and opening times before booking.";

      try {

        explanation = await requestAmmavan(plan, longVerdictPrompt(trip, plan, analysis));

      } catch (err) {

        setNotice(err instanceof Error ? `Alternative plan is ready, but the longer verdict failed: ${err.message}` : "Alternative plan is ready, but Ammavan's explanation is unavailable.");

      }

      setView({ analysis, plan, kind: "alternative", explanation });

    } catch (err) {

      setError(err instanceof Error ? err.message : "Could not generate an alternative. Try again.");

    } finally { setLoading(""); }

  }



  function usePlan(plan: Plan) {

    setTrip({

      destination: plan.destination, budget: plan.budget, estimatedCost: plan.estimatedCost,

      days: plan.days, activities: plan.activities, sleepHours: plan.sleepHours,

      travelHours: plan.travelHours, transportChanges: plan.transportChanges,

      brutalMode: plan.brutalMode,

    });

    setView(null); setError(""); setNotice("Plan copied into the form. Run the analysis again whenever you're ready.");

    window.scrollTo({ top: 0, behavior: "smooth" });

  }



  const result = view?.analysis;

  const scoreColor = !result || result.score < 40 ? "#67E8A5" : result.score < 70 ? "#FFB547" : "#FF5D65";



  return (

    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">

      <div className="mx-auto max-w-7xl">

        <header className="mb-10 flex items-center justify-between border-b border-white/10 pb-5">

          <a href="#" className="text-lg font-black tracking-tight"><span className="text-orange-400">TRVL</span> / REGRET ENGINE</a>

          <span className="rounded-full border border-orange-400/30 px-3 py-1 text-xs text-orange-300">EXPERIMENTAL AI</span>

        </header>



        <section className="mb-10 max-w-3xl">

          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-orange-400">Your trip. Your choices. Your consequences.</p>

          <h1 className="text-5xl font-black leading-[1.02] tracking-tight md:text-7xl">BAD TRIP?<br /><span className="text-orange-400">WE SAW IT COMING.</span></h1>

          <p className="mt-5 max-w-xl leading-7 text-zinc-400">Put your travel plans on trial. Find budget traps, impossible schedules and questionable life decisions before departure. Then let AI Ammavan help rescue the trip.</p>

        </section>



        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">

          <section className="panel p-5 md:p-7">

            <div className="mb-7 flex items-center justify-between"><div><p className="text-xs font-bold tracking-[0.2em] text-orange-400">01 / THE EVIDENCE</p><h2 className="mt-2 text-2xl font-bold">Your trip details</h2></div><span className="text-2xl">✈</span></div>

            <div className="space-y-5">

              <label className="field-label">Destination<input className="field" maxLength={100} value={trip.destination} onChange={(e) => update("destination", e.target.value)} placeholder="e.g. Goa" /></label>

              <div className="grid grid-cols-2 gap-4">

                <label className="field-label">Budget (₹)<input className="field" type="number" min="1" value={trip.budget} onChange={(e) => update("budget", Math.max(1, Number(e.target.value)))} /></label>

                <label className="field-label">Expected cost (₹)<input className="field" type="number" min="0" value={trip.estimatedCost} onChange={(e) => update("estimatedCost", Math.max(0, Number(e.target.value)))} /></label>

              </div>

              <div className="grid grid-cols-2 gap-4">

                <label className="field-label">Duration (days)<input className="field" type="number" min="1" max="60" value={trip.days} onChange={(e) => update("days", Math.max(1, Math.min(60, Number(e.target.value))))} /></label>

                <label className="field-label">Planned activities<input className="field" type="number" min="0" max="180" value={trip.activities} onChange={(e) => update("activities", Math.max(0, Math.min(180, Number(e.target.value))))} /></label>

              </div>

              <label className="field-label">Sleep per night<div className="flex items-center gap-4"><input className="flex-1 accent-orange-400" type="range" min="0" max="12" step="0.5" value={trip.sleepHours} onChange={(e) => update("sleepHours", Number(e.target.value))} /><span className="w-16 text-right font-bold">{trip.sleepHours} h</span></div></label>

              <label className="field-label">Total travel time (hours)<input className="field" type="number" min="0" max="1000" value={trip.travelHours} onChange={(e) => update("travelHours", Math.max(0, Number(e.target.value)))} /></label>

              <label className="field-label">Transport changes / transfers<div className="flex items-center gap-4"><input className="flex-1 accent-orange-400" type="range" min="0" max="10" value={trip.transportChanges} onChange={(e) => update("transportChanges", Number(e.target.value))} /><span className="w-8 text-right font-bold">{trip.transportChanges}</span></div></label>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 p-4"><input type="checkbox" checked={trip.brutalMode} onChange={(e) => update("brutalMode", e.target.checked)} className="size-4 accent-orange-400" /><span className="flex-1"><span className="block font-bold">Brutal mode</span><span className="text-xs text-zinc-500">No sugar-coating. Just the facts and the roast.</span></span><span>☠</span></label>

              <button onClick={analyse} disabled={!!loading || !trip.destination.trim()} className="w-full rounded-xl bg-orange-400 px-5 py-4 font-black text-black transition hover:bg-orange-300 disabled:cursor-wait disabled:opacity-60">{loading === "analyse" ? "ANALYSING YOUR DECISIONS..." : "CALCULATE MY REGRET ↗"}</button>

              {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

              {notice && <p role="status" className="rounded-lg border border-orange-400/20 bg-orange-400/5 p-3 text-sm text-orange-200">{notice}</p>}

            </div>

          </section>



          <section className="panel min-h-[500px] p-5 md:p-7">

            <div className="mb-7"><p className="text-xs font-bold tracking-[0.2em] text-orange-400">02 / THE VERDICT</p><h2 className="mt-2 text-2xl font-bold">Trip risk report</h2></div>

            {!result ? <div className="flex min-h-[380px] flex-col items-center justify-center text-center"><div className="mb-6 flex size-28 items-center justify-center rounded-full border border-dashed border-white/20 text-5xl">?</div><h3 className="text-xl font-bold">Your verdict awaits.</h3><p className="mt-2 max-w-xs text-sm leading-6 text-zinc-500">Submit your trip details to expose its biggest risk factors, then choose a rescue mode.</p><button onClick={analyse} disabled={!!loading} className="mt-6 rounded-lg border border-white/15 px-5 py-3 text-sm font-bold hover:border-orange-400">{loading === "analyse" ? "ANALYSING..." : "RUN SAMPLE ANALYSIS"}</button></div> : <div aria-live="polite">

              <div className="flex flex-col items-center gap-5 rounded-2xl bg-white/[0.03] p-6 sm:flex-row"><div className="flex size-36 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(${scoreColor} ${Math.max(0, Math.min(100, result.score)) * 3.6}deg, #292929 0deg)` }}><div className="flex size-28 flex-col items-center justify-center rounded-full bg-[#121212]"><span className="text-4xl font-black" style={{ color: scoreColor }}>{result.score}</span><span className="text-[10px] tracking-[0.2em] text-zinc-500">OUT OF 100</span></div></div><div><span className="rounded-full px-3 py-1 text-xs font-black" style={{ color: scoreColor, backgroundColor: `${scoreColor}18` }}>{result.level}</span><h3 className="mt-3 text-2xl font-black">{result.destination || trip.destination}</h3><p className="mt-1 text-sm text-zinc-400">Regret risk score</p></div></div>

              <div className="mt-7"><h3 className="mb-4 font-bold">Risk breakdown</h3><div className="space-y-5">{(result.risks || []).map((risk) => <div key={risk.name}><div className="mb-2 flex justify-between gap-3 text-sm"><span className="text-zinc-300">{risk.name}</span><span className="font-bold">{risk.score}/100</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-orange-400 transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, risk.score))}%` }} /></div><p className="mt-1 text-xs text-zinc-600">{risk.level} risk · contributes {risk.contribution} points</p></div>)}</div></div>

              <div className="mt-7 rounded-xl border border-orange-400/25 bg-orange-400/[0.06] p-5"><p className="text-xs font-black tracking-[0.15em] text-orange-400">{result.aiUsed ? "AI AMMAVAN VERDICT" : "ENGINE VERDICT"}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-200">{result.roast}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => speakMalayalam(result.roast)} className="rounded-lg bg-orange-400 px-4 py-2 text-sm font-bold text-black transition hover:bg-orange-300">▶ Play Malayalam voice</button>{voicePlaying && <button type="button" onClick={stopVoice} className="rounded-lg border border-white/20 px-4 py-2 text-sm font-bold text-zinc-200 hover:border-orange-400">■ Stop voice</button>}</div>{voiceNotice && <p role="status" className="mt-3 text-xs leading-5 text-orange-200">{voiceNotice}</p>}</div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2"><button onClick={automaticRescue} disabled={!!loading} className="rounded-xl border border-orange-400/40 bg-orange-400/10 px-4 py-4 text-left transition hover:bg-orange-400/20 disabled:opacity-50"><span className="block text-xs font-bold tracking-widest text-orange-300">{loading === "automatic" ? "WORKING..." : "RESCUE 01"}</span><span className="mt-1 block font-black">FIX THIS TRIP</span><span className="mt-1 block text-xs leading-5 text-zinc-400">Rule-based adjustments: lower overload, better sleep, fewer transfers.</span></button><button onClick={alternativeRescue} disabled={!!loading} className="rounded-xl border border-white/15 px-4 py-4 text-left transition hover:border-orange-400 disabled:opacity-50"><span className="block text-xs font-bold tracking-widest text-orange-300">{loading === "alternative" ? "ASKING AMMAVAN..." : "RESCUE 02"}</span><span className="mt-1 block font-black">FIND AN ALTERNATIVE</span><span className="mt-1 block text-xs leading-5 text-zinc-400">Ask AI Ammavan to design a different, more practical plan.</span></button></div>

              <p className="mt-4 text-xs leading-5 text-zinc-500">{result.disclaimer || "This is a planning aid, not live travel or booking data. Verify details before spending money."}</p>

            </div>}

          </section>

        </div>



        {view?.plan && <section className="panel mt-6 p-5 md:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-[0.2em] text-orange-400">03 / THE RESCUE PLAN</p><h2 className="mt-2 text-3xl font-black">{view.plan.title}</h2><p className="mt-2 max-w-3xl leading-7 text-zinc-400">{view.plan.summary}</p><p className="mt-2 text-sm text-zinc-500">{view.kind === "automatic" ? "Rule-based rescue" : "AI-generated alternative"} · Estimated figures only</p></div><button onClick={() => usePlan(view.plan!)} className="rounded-xl bg-orange-400 px-5 py-3 font-black text-black transition hover:bg-orange-300">USE THIS PLAN ↗</button></div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"><Metric label="Budget" value={money(view.plan.budget)} /><Metric label="Estimated cost" value={money(view.plan.estimatedCost)} /><Metric label="Duration" value={`${view.plan.days} days`} /><Metric label="Activities" value={String(view.plan.activities)} /><Metric label="Sleep / night" value={`${view.plan.sleepHours} h`} /><Metric label="Travel time" value={`${view.plan.travelHours} h`} /></div>

          {view.plan.estimatedCost > view.plan.budget && <p className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">Budget warning: this plan is estimated to exceed the stated budget by {money(view.plan.estimatedCost - view.plan.budget)}.</p>}

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><div><h3 className="mb-4 text-xl font-bold">Your day-by-day schedule</h3>{view.plan.schedule.length ? <div className="space-y-3">{view.plan.schedule.map((day, i) => <article key={`${day.day}-${i}`} className="rounded-xl border border-white/10 bg-white/[0.025] p-4"><p className="text-xs font-bold tracking-widest text-orange-300">DAY {day.day}</p><h4 className="mt-1 font-bold">{day.title}</h4><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-300">{day.activities.map((activity, j) => <li key={`${j}-${activity}`}>{activity}</li>)}</ul></article>)}</div> : <p className="text-sm text-zinc-500">No detailed schedule was returned. Use the recommendations below as a starting point.</p>}</div><div><h3 className="mb-4 text-xl font-bold">Ammavan's practical checklist</h3><ul className="space-y-3">{view.plan.recommendations.map((item, i) => <li key={`${i}-${item}`} className="flex gap-3 rounded-xl border border-white/10 p-4 text-sm leading-6 text-zinc-300"><span className="font-black text-orange-400">0{i + 1}</span><span>{item}</span></li>)}</ul><div className="mt-5 rounded-xl border border-orange-400/25 bg-orange-400/[0.06] p-5"><p className="text-xs font-black tracking-[0.15em] text-orange-400">AI AMMAVAN · FULL VERDICT</p><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-200">{view.explanation}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => speakMalayalam(view.explanation || "")} className="rounded-lg bg-orange-400 px-4 py-2 text-sm font-bold text-black transition hover:bg-orange-300">▶ Play Malayalam voice</button>{voicePlaying && <button type="button" onClick={stopVoice} className="rounded-lg border border-white/20 px-4 py-2 text-sm font-bold text-zinc-200 hover:border-orange-400">■ Stop voice</button>}</div>{voiceNotice && <p role="status" className="mt-3 text-xs leading-5 text-orange-200">{voiceNotice}</p>}</div><button onClick={() => usePlan(view.plan!)} className="mt-4 w-full rounded-xl bg-orange-400 px-5 py-4 font-black text-black transition hover:bg-orange-300">COPY RESCUE INTO FORM ↗</button></div></div>

          <p className="mt-6 border-t border-white/10 pt-4 text-xs leading-5 text-zinc-500">Important: generated budgets, schedules, and recommendations are planning suggestions, not verified bookings or live prices. Check transport, stay, entry fees, weather, and opening times before making payments.</p>

        </section>}



        <footer className="mt-10 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-5 text-xs text-zinc-600"><span>TRAVEL REGRET ENGINE · LAYOVER BUILD</span><span>PLAN BETTER. REGRET LESS.</span></footer>

      </div>

    </main>

  );

}



function Metric({ label, value }: { label: string; value: string }) {

  return <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-2 text-lg font-black text-orange-300">{value}</p></div>;

}
