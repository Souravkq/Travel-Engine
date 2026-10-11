import Link from "next/link";
import { ArrowRight, Brain, Coffee, Compass, FileSearch, Sparkles } from "lucide-react";
import { SmartImage } from "@/components/smart-image";
import { IMAGES } from "@/lib/images";

const FEATURES = [
  { icon: Brain, title: "AI-Powered Insights", text: "Get a personalised regret-risk score for your trip plan." },
  { icon: FileSearch, title: "Clear Explanations", text: "See exactly which part of your plan might become a regret." },
  { icon: Compass, title: "Better Travel Decisions", text: "Adjust your plan and travel with confidence." },
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-3xl">
        <SmartImage src={IMAGES.hero} alt="Santorini at sunset" className="h-[460px] w-full sm:h-[520px]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-12">
          <h1 className="max-w-xl text-4xl font-extrabold leading-tight !text-white sm:text-6xl">Travel Smarter. Fewer Regrets.</h1>
          <p className="mt-4 max-w-lg text-base text-white/90 sm:text-lg">
            Get an AI-powered regret risk score for your travel plans before you book. Discover what you might miss, what could go wrong, and how to make it amazing.
          </p>
          <div><Link href="/trip" className="btn-primary mt-6 !px-6">Check My Trip <ArrowRight size={18} aria-hidden /></Link></div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand"><Icon size={22} aria-hidden /></span>
            <h2 className="mt-3 text-lg font-bold">{title}</h2>
            <p className="mt-1 text-sm">{text}</p>
          </div>
        ))}
      </section>

      <section id="how-it-works" className="scroll-mt-24">
        <h2 className="text-center text-2xl font-bold">How It Works</h2>
        <ol className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            ["Tell us your plan", "Destination, dates, budget, pace, sleep and transfers."],
            ["We score it, transparently", "A rules-based engine weighs budget, schedule, fatigue and transport. No black box."],
            ["Ammavan roasts & rescues", "Get a funny verdict, insights, local ideas and three better plans."],
          ].map(([t, d], i) => (
            <li key={t} className="card p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>
              <h3 className="mt-3 font-bold">{t}</h3><p className="mt-1 text-sm">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="about" className="scroll-mt-24 grid items-center gap-6 rounded-3xl bg-gradient-to-br from-brand-soft to-white p-6 md:grid-cols-2 md:p-10">
        <div>
          <span className="chip"><Sparkles size={12} className="mr-1 inline" aria-hidden />Powered by Sarvam AI</span>
          <h2 className="mt-3 flex items-center gap-2 text-2xl font-bold"><Coffee className="text-brand" aria-hidden /> Meet AI Ammavan</h2>
          <p className="mt-3 text-sm leading-relaxed">
            Ammavan is a witty, Malayalam-first Kerala travel uncle. He isn&apos;t a chatbot — when you analyse your trip he steps in on his own, roasts questionable decisions, explains the risks and suggests better plans. Choose Malayalam, English, Tamil or Hindi.
          </p>
          <p className="mt-3 text-xs">The score itself is calculated by a transparent rules engine. Ammavan only explains it, and gives general suggestions — never verified facts about prices or opening hours.</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">Ammavan on an unrealistic plan</p>
          <p className="mt-2 text-sm text-navy">Plan: 8 destinations in 3 days, 4 hours of sleep.</p>
          <blockquote className="mt-3 rounded-xl border-l-4 border-brand bg-lavender p-4 text-[15px] text-navy">
            ഡാ മോനേ, ബജറ്റ് ₹2,000, പ്ലാൻ ₹5,000! ബാക്കി കാശ് ഞാൻ ഇറക്കണോ?
          </blockquote>
          <p className="mt-2 text-xs">“Dear son, budget ₹2,000, plan ₹5,000! Should I pay the rest?” (Example only.)</p>
        </div>
      </section>
    </div>
  );
}
