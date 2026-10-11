"use client";
import { Backpack, ExternalLink, ShieldCheck } from "lucide-react";
import { destinationList } from "@/lib/scoring";
import { COMPANION_OPTIONS, type Trip } from "@/lib/types";
import { T } from "@/lib/fallback";

const SAFETY = [
  "Share your itinerary and check in with someone you trust each day.",
  "Meet new people in public, busy, daytime places first.",
  "Keep copies of your documents and emergency numbers offline.",
  "Trust your instincts — leave any situation that feels off.",
  "Check recent reviews and official sources before booking tours or stays.",
];

export function SoloCompanion({ trip, onChange, note }: { trip: Trip; onChange: (t: Trip) => void; note?: string }) {
  const dest = destinationList(trip)[0] ?? "your destination";
  const prefs = trip.companionPrefs;
  const toggle = (o: string) => onChange({ ...trip, companionPrefs: prefs.includes(o) ? prefs.filter((p) => p !== o) : [...prefs, o] });

  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold"><Backpack size={20} className="text-brand" aria-hidden /> Solo Traveller Companion</h2>
      <p className="mt-2 text-sm">Ammavan can&apos;t come with you, but he can point you towards group activities. This is an AI persona only — no real people or profiles are shown, and human matching isn&apos;t available in this version.</p>
      <blockquote className="mt-3 rounded-lg border-l-4 border-brand bg-lavender p-3 text-sm text-navy">{note ?? T[trip.language].solo}</blockquote>

      <fieldset className="mt-4">
        <legend className="label">What kind of company do you want?</legend>
        <div className="flex flex-wrap gap-2">
          {COMPANION_OPTIONS.map((o) => (
            <button key={o} type="button" aria-pressed={prefs.includes(o)} onClick={() => toggle(o)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${prefs.includes(o) ? "border-brand bg-brand text-white" : "border-line bg-white text-navy hover:bg-lavender"}`}>{o}</button>
          ))}
        </div>
      </fieldset>

      {prefs.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {prefs.map((o) => (
            <li key={o} className="rounded-xl border border-line p-3 text-sm">
              <p className="font-semibold text-navy">{o}</p>
              <a className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline" target="_blank" rel="noopener noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o} ${dest}`)}`}>
                Search near {dest} <ExternalLink size={12} aria-hidden />
              </a>
              <p className="mt-1 text-[11px]">Search link only — check reviews and organiser details yourself.</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 rounded-xl bg-emerald-50 p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-900"><ShieldCheck size={16} aria-hidden /> Solo travel safety basics</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-emerald-900">{SAFETY.map((s) => <li key={s}>{s}</li>)}</ul>
        <p className="mt-2 text-[11px] text-emerald-800">General guidance only; it is not a safety guarantee for any place.</p>
      </div>
    </section>
  );
}
