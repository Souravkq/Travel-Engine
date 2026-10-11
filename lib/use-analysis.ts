"use client";
import { useEffect, useState } from "react";
import type { ScoreResult, Trip } from "./types";

type State = { loading: boolean; result: ScoreResult | null; error: string | null };

/** Fetches the deterministic score from the server for the saved trip. */
/** Key that ignores companion preferences so ticking them doesn't re-run analysis. */
export const coreKey = (trip: Trip | null) => (trip ? JSON.stringify({ ...trip, companionPrefs: [] }) : null);

export function useAnalysis(trip: Trip | null) {
  const [state, setState] = useState<State>({ loading: false, result: null, error: null });
  const key = coreKey(trip);
  useEffect(() => {
    if (!key) return;
    const t = JSON.parse(key) as Trip;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ loading: true, result: null, error: null });
    fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trip: t }) })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || !data.ok) throw new Error(Object.values(data.errors ?? {})[0] as string ?? "Analysis failed.");
        if (!cancelled) setState({ loading: false, result: data.result, error: null });
      })
      .catch((e: Error) => !cancelled && setState({ loading: false, result: null, error: e.message || "Analysis failed." }));
    return () => {
      cancelled = true;
    };
  }, [key]);
  return state;
}
