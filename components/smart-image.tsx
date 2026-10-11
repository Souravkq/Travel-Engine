"use client";
import { useState } from "react";
import { MapPin } from "lucide-react";

/** <img> with a graceful gradient fallback so we never show a broken image. */
export function SmartImage({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div role="img" aria-label={alt} className={`flex items-center justify-center bg-gradient-to-br from-indigo-200 via-violet-200 to-sky-200 text-navy ${className}`}>
        <span className="flex items-center gap-1 text-sm font-semibold"><MapPin size={16} /> {alt}</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}
