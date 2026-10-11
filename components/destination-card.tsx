import { ArrowRight } from "lucide-react";
import { SmartImage } from "./smart-image";
import { RiskBadge, LEVEL_COLOR } from "./risk-badge";
import type { RiskLevel } from "@/lib/types";

export function DestinationCard({ title, image, tags, score, level, onTry }: { title: string; image: string; tags: string[]; score: number; level: RiskLevel; onTry: () => void }) {
  return (
    <article className="card overflow-hidden">
      <SmartImage src={image} alt={title} className="h-40 w-full" />
      <div className="p-4">
        <h3 className="font-bold">{title}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">{tags.map((t) => <span key={t} className="chip">{t}</span>)}</div>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border-4 text-sm font-bold text-navy" style={{ borderColor: LEVEL_COLOR[level] }}>{score}</span>
          <div>
            <RiskBadge level={level} />
            <p className="mt-0.5 text-[11px]">Illustrative example score</p>
          </div>
        </div>
        <button onClick={onTry} className="btn-primary mt-4 w-full text-sm">Try This Trip <ArrowRight size={16} aria-hidden /></button>
      </div>
    </article>
  );
}
