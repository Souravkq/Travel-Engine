"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Plane, X } from "lucide-react";
import { useState } from "react";
import { clearTrip } from "@/lib/trip-storage";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/examples", label: "Examples" },
  { href: "/#about", label: "About" },
];
const RESULT_PAGES = ["/results", "/insights", "/alternatives"];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isResult = RESULT_PAGES.includes(pathname);

  function cta() {
    setOpen(false);
    if (isResult) clearTrip(); // "New Trip" starts fresh
    router.push("/trip");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-navy" onClick={() => setOpen(false)}>
          <Plane size={20} className="text-brand" aria-hidden /> Travel Regret Engine
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-6 text-sm md:flex">
          {NAV.map((n) => <Link key={n.label} href={n.href} className={`hover:text-brand ${pathname === n.href ? "font-semibold text-navy" : ""}`}>{n.label}</Link>)}
          <button onClick={cta} className="btn-primary !px-4 !py-2 text-sm">{isResult ? "New Trip" : "Get Started"}</button>
        </nav>
        <button className="md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav aria-label="Mobile" className="flex flex-col gap-1 border-t border-line bg-white px-4 py-3 md:hidden">
          {NAV.map((n) => <Link key={n.label} href={n.href} onClick={() => setOpen(false)} className="rounded-lg px-2 py-2 hover:bg-lavender">{n.label}</Link>)}
          <button onClick={cta} className="btn-primary mt-2">{isResult ? "New Trip" : "Get Started"}</button>
        </nav>
      )}
    </header>
  );
}
