import type { Mood } from "@/lib/types";

/** Illustrated Ammavan (glasses, big moustache). The face changes with `mood`. */
export function AmmavanAvatar({ mood = "amused", size = 96, animate = true, thinking = false }: { mood?: Mood; size?: number; animate?: boolean; thinking?: boolean }) {
  const wide = mood === "shocked" || mood === "alarmed";
  const brows: Record<Mood, string> = {
    proud: "M39 41 Q48 36 56 41 M64 41 Q72 36 81 41",
    amused: "M39 42 L56 42 M64 38 Q72 34 81 40",
    worried: "M39 44 L56 38 M64 38 L81 44",
    shocked: "M39 37 Q48 31 56 37 M64 37 Q72 31 81 37",
    alarmed: "M39 35 Q48 28 56 35 M64 35 Q72 28 81 35",
  };
  const mouths: Record<Mood, React.ReactNode> = {
    proud: <path d="M50 77 Q60 86 70 77" fill="none" stroke="#7a3b2e" strokeWidth="2.5" strokeLinecap="round" />,
    amused: <path d="M52 77 Q62 83 71 74" fill="none" stroke="#7a3b2e" strokeWidth="2.5" strokeLinecap="round" />,
    worried: <path d="M51 80 Q56 76 60 80 Q64 84 69 80" fill="none" stroke="#7a3b2e" strokeWidth="2.5" strokeLinecap="round" />,
    shocked: <ellipse cx="60" cy="79" rx="5" ry="6" fill="#5a2a22" />,
    alarmed: <ellipse cx="60" cy="80" rx="7" ry="8" fill="#5a2a22" />,
  };
  return (
    <svg
      viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`Ammavan looks ${mood}`}
      className={animate ? (mood === "alarmed" ? "ammavan-shake" : "ammavan-bob") : undefined}
    >
      <circle cx="60" cy="60" r="58" fill="#ece9ff" />
      {/* shirt + mundu-white shoulders */}
      <path d="M14 112 Q16 88 60 88 Q104 88 106 112 Q60 126 14 112Z" fill="#ffffff" stroke="#c9c6e8" />
      <rect x="52" y="80" width="16" height="12" rx="4" fill="#d79a68" />
      {/* hair tufts */}
      <ellipse cx="33" cy="54" rx="6" ry="11" fill="#e4e2ee" />
      <ellipse cx="87" cy="54" rx="6" ry="11" fill="#e4e2ee" />
      {/* face */}
      <circle cx="60" cy="56" r="28" fill="#e0a878" />
      <path d="M44 33 Q60 24 76 33" fill="none" stroke="#e4e2ee" strokeWidth="3" strokeLinecap="round" />
      {/* brows */}
      <path d={brows[mood]} fill="none" stroke="#3b3b4f" strokeWidth="2.6" strokeLinecap="round" />
      {/* glasses */}
      <circle cx="48" cy="52" r="9" fill="#ffffff" fillOpacity=".65" stroke="#1b1b4b" strokeWidth="2" />
      <circle cx="72" cy="52" r="9" fill="#ffffff" fillOpacity=".65" stroke="#1b1b4b" strokeWidth="2" />
      <path d="M57 51 H63" stroke="#1b1b4b" strokeWidth="2" />
      {/* eyes */}
      <circle cx="48" cy="53" r={wide ? 4.5 : 2.6} fill="#1b1b4b" />
      <circle cx="72" cy="53" r={wide ? 4.5 : 2.6} fill="#1b1b4b" />
      {/* nose + moustache */}
      <path d="M60 56 Q57 64 61 65" fill="none" stroke="#b9774a" strokeWidth="2" strokeLinecap="round" />
      <path d="M42 68 Q52 60 60 67 Q68 60 78 68 Q68 76 60 70 Q52 76 42 68Z" fill="#3b3b4f" />
      {mouths[mood]}
      {mood === "alarmed" && <path d="M92 36 Q96 44 92 48 Q88 44 92 36Z" fill="#7dd3fc" />}
      {thinking && <text x="88" y="30" fontSize="16" aria-hidden="true">☕</text>}
    </svg>
  );
}
