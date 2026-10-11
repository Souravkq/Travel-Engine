export function RecommendationCard({ index, text }: { index: number; text: string }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-line bg-white p-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">{index}</span>
      <p className="text-sm text-navy">{text}</p>
    </li>
  );
}
