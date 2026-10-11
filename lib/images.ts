const u = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=70`;

export const IMAGES = {
  hero: u("photo-1570077188670-e3a8d69ac5ff"), // Santorini
  tokyo: u("photo-1540959733332-eab4deabeeaf"),
  paris: u("photo-1502602898657-3e91760cbb34"),
  bali: u("photo-1537996194471-e657df975ab4"),
  newyork: u("photo-1496442226666-8d4d0e62e6e9"),
  italy: u("photo-1523906834658-6e24ef2386f9"),
  iceland: u("photo-1476610182048-b716b8518aae"),
  kerala: u("photo-1602216056096-3b40cc0c9944"),
  generic: u("photo-1488646953014-85cb44e25828"),
};

const KEYWORDS: [string[], keyof typeof IMAGES][] = [
  [["tokyo", "japan", "kyoto", "osaka"], "tokyo"],
  [["paris", "france"], "paris"],
  [["bali", "indonesia"], "bali"],
  [["new york", "nyc", "usa", "america"], "newyork"],
  [["italy", "rome", "venice", "florence", "milan"], "italy"],
  [["iceland", "reykjavik"], "iceland"],
  [["kerala", "munnar", "kochi", "cochin", "alleppey", "alappuzha", "wayanad", "kozhikode", "calicut", "varkala", "thekkady"], "kerala"],
];

export function imageForDestination(destinations: string): string {
  const d = destinations.toLowerCase();
  for (const [keys, img] of KEYWORDS) if (keys.some((k) => d.includes(k))) return IMAGES[img];
  return IMAGES.generic;
}
