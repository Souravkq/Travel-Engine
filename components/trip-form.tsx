"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Landmark, Loader2, Mountain, Palmtree, Sparkles, Utensils, type LucideIcon } from "lucide-react";
import { DEFAULT_DAILY_BUDGET, inr } from "@/lib/scoring";
import { LANGUAGES, LANGUAGE_LABELS, ROAST_LABELS, ROAST_LEVELS, STYLES, TRAVELLER_TYPES, type Language, type RoastLevel, type Trip, type TravelStyle } from "@/lib/types";
import { daysBetween, validateTrip } from "@/lib/validation";
import { useTrip } from "@/lib/trip-storage";

type Form = Record<string, string>;
const STYLE_ICONS: Record<TravelStyle, LucideIcon> = { Relaxation: Palmtree, Adventure: Mountain, Culture: Landmark, Food: Utensils, Mixed: Sparkles };
const STEP1 = ["destinations", "startDate", "endDate", "style", "travellerType", "estimatedCost", "days", "budgetPerPerson"];
const iso = (d: Date) => d.toISOString().slice(0, 10);

function defaults(): Form {
  const start = new Date(Date.now() + 30 * 86_400_000);
  const end = new Date(start.getTime() + 4 * 86_400_000);
  return { destinations: "", startDate: iso(start), endDate: iso(end), style: "Mixed", travellerType: "Solo", budgetPerDay: String(DEFAULT_DAILY_BUDGET), estimatedCost: "20000", activities: "8", travelHoursPerDay: "3", sleepHours: "7", transfers: "2", interests: "", language: "ml", roast: "medium" };
}
const fromTrip = (t: Trip): Form => ({
  destinations: t.destinations, startDate: t.startDate, endDate: t.endDate, style: t.style, travellerType: t.travellerType,
  budgetPerDay: String(Math.round(t.budgetPerPerson / Math.max(1, t.days))), estimatedCost: String(t.estimatedCost), activities: String(t.activities),
  travelHoursPerDay: String(t.travelHoursPerDay), sleepHours: String(t.sleepHours), transfers: String(t.transfers), interests: t.interests, language: t.language, roast: t.roast,
});

/** Errors on fields that no longer have a visible input are shown in the form-level alert instead. */
function surfaceHidden(errs: Record<string, string>): Record<string, string> {
  const out = { ...errs };
  for (const k of ["days", "budgetPerPerson"]) {
    if (out[k]) { out._form = out._form ?? out[k]; delete out[k]; }
  }
  return out;
}

export function TripForm() {
  const router = useRouter();
  const { trip, loaded, setTrip } = useTrip();
  const [form, setForm] = useState<Form | null>(null);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (loaded && !form) setForm(trip ? fromTrip(trip) : defaults());
  }, [loaded, trip, form]);

  const set = (k: string, v: string) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    setErrors((e) => { if (!e[k]) return e; const { [k]: _, ...rest } = e; void _; return rest; });
  };

  /** Days and the reference budget are not asked: days come from the dates, budget = reference/day x days. */
  const payload = (f: Form) => {
    const days = f.startDate && f.endDate && f.endDate >= f.startDate ? daysBetween(f.startDate, f.endDate) : NaN;
    const perDay = Number(f.budgetPerDay) || DEFAULT_DAILY_BUDGET;
    const { budgetPerDay: _b, ...rest } = f;
    void _b;
    return { ...rest, ...(Number.isFinite(days) ? { budgetPerPerson: Math.round(perDay * days) } : {}), companionPrefs: trip?.companionPrefs ?? [] };
  };

  const checks = useMemo(() => (form ? validateTrip(payload(form)) : null), [form, trip]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!form) return <div className="card mx-auto max-w-3xl p-10 text-center"><Loader2 className="mx-auto animate-spin text-brand" aria-label="Loading" /></div>;

  const err = (k: string) => errors[k];
  const field = (k: string) => ({ id: k, "aria-invalid": err(k) ? true : undefined, "aria-describedby": err(k) ? `${k}-err` : undefined } as const);
  const Err = ({ k }: { k: string }) => (err(k) ? <p id={`${k}-err`} role="alert" className="field-error">{err(k)}</p> : null);

  function next() {
    const found = checks && !checks.ok ? surfaceHidden(Object.fromEntries(Object.entries(checks.errors).filter(([k]) => STEP1.includes(k)))) : {};
    setErrors(found);
    if (Object.keys(found).length === 0) setStep(2);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (checks && !checks.ok) {
      const ce = surfaceHidden(checks.errors);
      setErrors(ce);
      if (Object.keys(ce).some((k) => STEP1.includes(k))) setStep(1);
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      const candidate = payload(form);
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trip: candidate }) });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const errs = surfaceHidden((data.errors ?? { _form: "Something went wrong. Please try again." }) as Record<string, string>);
        setErrors(errs);
        setStep(Object.keys(errs).some((k) => STEP1.includes(k)) ? 1 : 2);
        setBusy(false);
        return;
      }
      setWarnings(data.warnings ?? []);
      setTrip(data.trip as Trip); // persist the cleaned trip
      router.push("/results");
    } catch {
      setErrors({ _form: "Couldn't reach the server. Check your connection and try again." });
      setBusy(false);
    }
  }

  const steps = ["Trip Details", "Preferences", "Get Results"];
  const active = busy ? 3 : step;

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-3xl">
      <ol className="mb-8 flex items-center justify-center gap-2 text-xs" aria-label="Progress">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2" aria-current={active === i + 1 ? "step" : undefined}>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${active >= i + 1 ? "border-brand bg-brand text-white" : "border-line bg-white"}`}>{i + 1}</span>
            <span className={active === i + 1 ? "font-semibold text-navy" : ""}>{s}</span>
            {i < 2 && <span className="mx-1 h-px w-8 bg-line sm:w-14" aria-hidden />}
          </li>
        ))}
      </ol>

      <div className="card p-5 sm:p-8">
        <h1 className="text-center text-2xl font-bold">Tell Us About Your Trip</h1>
        <p className="mb-6 mt-1 text-center text-sm">The more details you provide, the more personalised your insights.</p>

        {errors._form && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{errors._form}</p>}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="label" htmlFor="destinations">Destination(s)</label>
              <input {...field("destinations")} className="input" placeholder="e.g. Munnar, Alleppey (comma-separated)" value={form.destinations} onChange={(e) => set("destinations", e.target.value)} maxLength={200} />
              <Err k="destinations" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="startDate">Start date</label><input {...field("startDate")} type="date" className="input" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /><Err k="startDate" /></div>
              <div><label className="label" htmlFor="endDate">End date</label><input {...field("endDate")} type="date" className="input" value={form.endDate} min={form.startDate} onChange={(e) => set("endDate", e.target.value)} /><Err k="endDate" /></div>
            </div>
            <fieldset>
              <legend className="label">Travel style</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {STYLES.map((s) => {
                  const Icon = STYLE_ICONS[s];
                  const on = form.style === s;
                  return (
                    <button key={s} type="button" aria-pressed={on} onClick={() => set("style", s)}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-semibold ${on ? "border-brand bg-brand-soft text-brand" : "border-line bg-white text-navy hover:bg-lavender"}`}>
                      <Icon size={20} aria-hidden /> {s}
                    </button>
                  );
                })}
              </div>
              <Err k="style" />
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="estimatedCost">Estimated trip cost per person (₹)</label><input {...field("estimatedCost")} inputMode="numeric" className="input" value={form.estimatedCost} onChange={(e) => set("estimatedCost", e.target.value)} /><p className="mt-1 text-[11px]">Ammavan compares this with a reference of about {inr(Number(form.budgetPerDay) || DEFAULT_DAILY_BUDGET)} per day.</p><Err k="estimatedCost" /></div>
              <div><label className="label" htmlFor="travellerType">Who is travelling?</label>
                <select {...field("travellerType")} className="input" value={form.travellerType} onChange={(e) => set("travellerType", e.target.value)}>{TRAVELLER_TYPES.map((t) => <option key={t}>{t}</option>)}</select><Err k="travellerType" /></div>
            </div>
            <div className="flex justify-between pt-2">
              <button type="button" className="btn-ghost" onClick={() => router.push("/")}><ArrowLeft size={16} aria-hidden /> Back</button>
              <button type="button" className="btn-primary" onClick={next}>Next <ArrowRight size={16} aria-hidden /></button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="activities">Planned activities (total)</label><input {...field("activities")} inputMode="numeric" className="input" value={form.activities} onChange={(e) => set("activities", e.target.value)} /><Err k="activities" /></div>
              <div><label className="label" htmlFor="transfers">Transport changes / transfers (total)</label><input {...field("transfers")} inputMode="numeric" className="input" value={form.transfers} onChange={(e) => set("transfers", e.target.value)} /><Err k="transfers" /></div>
              <div><label className="label" htmlFor="travelHoursPerDay">Travel hours per day (avg)</label><input {...field("travelHoursPerDay")} inputMode="decimal" className="input" value={form.travelHoursPerDay} onChange={(e) => set("travelHoursPerDay", e.target.value)} /><Err k="travelHoursPerDay" /></div>
              <div><label className="label" htmlFor="sleepHours">Sleep hours per night</label><input {...field("sleepHours")} type="number" min={0} max={12} step={0.5} inputMode="decimal" className="input" value={form.sleepHours} onChange={(e) => set("sleepHours", e.target.value)} /><p className="mt-1 text-[11px]">0 is allowed — Ammavan will have opinions.</p><Err k="sleepHours" /></div>
            </div>
            <div><label className="label" htmlFor="interests">Interests &amp; preferences (optional)</label>
              <input {...field("interests")} className="input" placeholder="e.g. hiking, local food, temples, quiet places" value={form.interests} onChange={(e) => set("interests", e.target.value)} maxLength={300} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="language">AI Ammavan&apos;s language</label>
                <select {...field("language")} className="input" value={form.language} onChange={(e) => set("language", e.target.value as Language)}>{LANGUAGES.map((l) => <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>)}</select><Err k="language" /></div>
              <div><label className="label" htmlFor="roast">Roast intensity</label>
                <select {...field("roast")} className="input" value={form.roast} onChange={(e) => set("roast", e.target.value as RoastLevel)}>{ROAST_LEVELS.map((r) => <option key={r} value={r}>{ROAST_LABELS[r]}</option>)}</select><Err k="roast" /></div>
            </div>
            {warnings.map((w) => <p key={w} className="text-xs text-amber-700">{w}</p>)}
            <div className="flex justify-between pt-2">
              <button type="button" className="btn-ghost" onClick={() => setStep(1)} disabled={busy}><ArrowLeft size={16} aria-hidden /> Back</button>
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? <><Loader2 size={16} className="animate-spin" aria-hidden /> Analyzing…</> : <>Analyze My Trip <ArrowRight size={16} aria-hidden /></>}
              </button>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
