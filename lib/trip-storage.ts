"use client";
import { useCallback, useEffect, useState } from "react";
import type { Trip } from "./types";
import { validateTrip } from "./validation";

const KEY = "tre:trip:v1";

export function readTrip(): Trip | null {
  try {
    const s = window.localStorage.getItem(KEY);
    if (!s) return null;
    const v = validateTrip(JSON.parse(s));
    return v.ok ? v.trip : null;
  } catch {
    return null;
  }
}
export function writeTrip(trip: Trip) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(trip));
  } catch {
    /* storage unavailable (private mode) - app still works for this page */
  }
}
export function clearTrip() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Loads the saved trip after mount (avoids hydration mismatches). */
export function useTrip() {
  const [trip, setTripState] = useState<Trip | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTripState(readTrip());
    setLoaded(true);
  }, []);
  const setTrip = useCallback((t: Trip) => {
    writeTrip(t);
    setTripState(t);
  }, []);
  const clear = useCallback(() => {
    clearTrip();
    setTripState(null);
  }, []);
  return { trip, loaded, setTrip, clear };
}
