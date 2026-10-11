import Link from "next/link";
export function NoTrip() {
  return (
    <div className="card mx-auto mt-10 max-w-lg p-8 text-center">
      <h1 className="text-xl font-bold">No trip to analyse yet</h1>
      <p className="mt-2 text-sm">Tell us about your plan first, or try one of the example trips.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link href="/trip" className="btn-primary">Plan a Trip</Link>
        <Link href="/examples" className="btn-ghost">See Examples</Link>
      </div>
    </div>
  );
}
