/**
 * Offline Ammavan: used when the Sarvam API is unavailable/unconfigured, and
 * for contextual one-liners. Everything here is derived from the deterministic
 * score - nothing is invented.
 */
import { destinationList, inr } from "./scoring";
import { SEVERE_SLEEP_MAX } from "./scoring";
import type { AmmavanVerdict, FactorId, Language, Mood, RiskLevel, ScoreResult, Trip } from "./types";

export type Vars = { budget: string; cost: string; apd: string; sleep: string; travel: string; transfers: number; days: number };
type FactorText = { roast: (v: Vars) => string; tip: string };
type Pack = {
  low: string; moderate: string; high: string;
  factor: Record<FactorId, FactorText>;
  rescue: string; solo: string; places: string; alt: string; generic: string;
};

export const T: Record<Language, Pack> = {
  en: {
    low: "Fine, fine — not much for me to complain about. Pack light and drink your tea.",
    moderate: "Not a disaster, but a few things here need fixing before you pay for tickets.",
    high: "Arre, this plan is more stressed than a Kochi traffic signal at 6 pm. Let's rescue it.",
    factor: {
      budget: { roast: (v) => `Budget ${v.budget}, plan ${v.cost}. Shall I pay the rest?`, tip: "Trim the cost or raise the budget; keep a 10–15% buffer for surprises." },
      schedule: { roast: (v) => `${v.apd} activities a day? It's a holiday, not a TV quiz show.`, tip: "Pick 1–2 must-do things per day and treat the rest as a bonus." },
      fatigue: { roast: (v) => `${v.sleep}h of sleep and ${v.travel}h on the road daily — you'll photograph the sights and remember none of them.`, tip: "Protect 7–8 hours of sleep and cap daily transit time." },
      transport: { roast: (v) => `${v.transfers} transfers in ${v.days} days? That's a relay race, not a trip.`, tip: "Use direct routes and group nearby places to cut transfers." },
    },
    rescue: "Open Rescue Mode — three rebuilt plans, each re-scored by the same engine.",
    solo: "Travelling solo? Join a group walk or class on day one — an easy way to meet people in daytime, public settings.",
    places: "These are general ideas — check recent reviews and timings before you go.",
    alt: "Look at what changed: fewer rushed days, more tea breaks. That's the real upgrade.",
    generic: "Small fix, big difference.",
  },
  ml: {
    low: "കൊള്ളാം മോനേ, ഇത്തവണ എനിക്ക് കുറ്റം പറയാൻ ഒന്നുമില്ല! ചായ കുടിച്ചിട്ട് ഇറങ്ങിക്കോ.",
    moderate: "ഒട്ടും മോശമില്ല, പക്ഷേ ടിക്കറ്റ് എടുക്കുന്നതിനു മുമ്പ് ചില കാര്യങ്ങൾ ഒന്ന് നേരെയാക്കണം.",
    high: "എന്റെ പൊന്നേ, ഈ plan വൈകുന്നേരത്തെ കൊച്ചി traffic പോലെ ആകെ കുരുങ്ങിക്കിടക്കുവാ! നമുക്ക് ഇത് രക്ഷിച്ചെടുക്കാം.",
    factor: {
      budget: { roast: (v) => `ഡാ മോനേ, budget ${v.budget}, plan ${v.cost}! ബാക്കി കാശ് ഞാൻ ഇറക്കണോ? Trip കഴിഞ്ഞ് തിരിച്ചുള്ള ticket പോലും ആലോചിക്കേണ്ടി വരും!`, tip: "ചെലവ് കുറയ്ക്കുക, അല്ലെങ്കിൽ ബജറ്റ് കൂട്ടുക; അപ്രതീക്ഷിത ചെലവിന് 10–15% കരുതൽ വെക്കുക." },
      schedule: { roast: (v) => `ഒരു ദിവസം ${v.apd} പരിപാടിയോ? ഇത് tour ആണോ അതോ TV quiz show ആണോ?`, tip: "ദിവസം 1–2 'നിർബന്ധമായും കാണേണ്ടത്' മതി; ബാക്കി ബോണസ് ആയി കാണുക." },
      fatigue: { roast: (v) => `ദിവസം ${v.sleep} മണിക്കൂർ ഉറക്കം, ${v.travel} മണിക്കൂർ യാത്ര — ഫോട്ടോ എടുക്കും, പക്ഷേ ഒന്നും ഓർമ്മയുണ്ടാകില്ല!`, tip: "7–8 മണിക്കൂർ ഉറക്കം ഉറപ്പാക്കുക; ദിവസേനയുള്ള യാത്രാസമയം കുറയ്ക്കുക." },
      transport: { roast: (v) => `${v.days} ദിവസത്തിൽ ${v.transfers} തവണ വണ്ടി മാറണോ? ഇത് യാത്രയല്ല, relay race ആണ് മോനേ!`, tip: "നേരിട്ടുള്ള റൂട്ടുകൾ തിരഞ്ഞെടുക്കുക; അടുത്തടുത്ത സ്ഥലങ്ങൾ ഒരുമിച്ച് കാണുക." },
    },
    rescue: "റെസ്ക്യൂ മോഡ് തുറക്കൂ — ഒരേ എൻജിൻ കൊണ്ട് വീണ്ടും സ്കോർ ചെയ്ത മൂന്ന് പുതിയ പ്ലാനുകൾ.",
    solo: "ഒറ്റയ്ക്കാണോ യാത്ര? ആദ്യ ദിവസം തന്നെ ഒരു ഗ്രൂപ്പ് വാക്കിംഗ് ടൂറിലോ ക്ലാസിലോ ചേരൂ — പകൽ, പൊതുസ്ഥലത്ത് ആളുകളെ പരിചയപ്പെടാൻ ഏറ്റവും എളുപ്പം.",
    places: "ഇതൊക്കെ പൊതുവായ നിർദ്ദേശങ്ങളാണ്; പോകുന്നതിനു മുമ്പ് പുതിയ റിവ്യൂവും സമയവും ഒന്ന് നോക്കണേ.",
    alt: "എന്തൊക്കെ മാറി എന്ന് നോക്ക് — ഓട്ടം കുറഞ്ഞു, ചായ കുടിക്കാൻ സമയം കൂടി. അതാണ് യഥാർത്ഥ നേട്ടം.",
    generic: "ചെറിയ മാറ്റം, വലിയ വ്യത്യാസം മോനേ.",
  },
  ta: {
    low: "நல்லது தம்பி, இந்த முறை குறை சொல்ல ஒன்றும் இல்லை! டீ குடிச்சிட்டு கிளம்பு.",
    moderate: "மோசமில்லை, ஆனால் டிக்கெட் எடுக்கும் முன் சில விஷயங்களை சரிசெய்ய வேண்டும்.",
    high: "அடப்பாவமே, இந்த திட்டம் மாலை நேர போக்குவரத்து நெரிசல் மாதிரி சிக்கிக் கிடக்கு! சேர்ந்து காப்பாற்றலாம்.",
    factor: {
      budget: { roast: (v) => `பட்ஜெட் ${v.budget}, திட்டம் ${v.cost}! மீதிப் பணத்தை நான் போடணுமா?`, tip: "செலவைக் குறைக்கவும் அல்லது பட்ஜெட்டை உயர்த்தவும்; எதிர்பாராத செலவுக்கு 10–15% கையிருப்பு வைக்கவும்." },
      schedule: { roast: (v) => `ஒரு நாளைக்கு ${v.apd} இடமா? இது சுற்றுலாவா, இல்ல டிவி க்விஸ் ஷோவா?`, tip: "ஒரு நாளுக்கு 1–2 முக்கிய இடங்கள் போதும்; மீதி போனஸ்." },
      fatigue: { roast: (v) => `தினமும் ${v.sleep} மணி தூக்கம், ${v.travel} மணி பயணம் — போட்டோ எடுப்பீங்க, ஆனா எதுவும் நினைவிருக்காது!`, tip: "7–8 மணி தூக்கத்தை உறுதிசெய்து, தினசரி பயண நேரத்தைக் குறைக்கவும்." },
      transport: { roast: (v) => `${v.days} நாட்களில் ${v.transfers} முறை வாகனம் மாறணுமா? இது பயணம் இல்ல, ரிலே ஓட்டம்!`, tip: "நேரடி வழிகளைத் தேர்ந்தெடுத்து, அருகிலுள்ள இடங்களை ஒன்றாகப் பாருங்கள்." },
    },
    rescue: "ரெஸ்கியூ மோடை திறங்கள் — அதே என்ஜினால் மீண்டும் மதிப்பிடப்பட்ட மூன்று புதிய திட்டங்கள்.",
    solo: "தனியாகப் பயணமா? முதல் நாளே ஒரு குழு நடைப்பயணம் அல்லது வகுப்பில் சேருங்கள் — பகலில், பொது இடத்தில் மக்களைச் சந்திக்க எளிய வழி.",
    places: "இவை பொதுவான யோசனைகள்; செல்லும் முன் சமீபத்திய மதிப்புரைகளையும் நேரங்களையும் சரிபாருங்கள்.",
    alt: "என்ன மாறியது என்று பாருங்கள் — அவசரம் குறைவு, டீ குடிக்க நேரம் அதிகம். அதுதான் உண்மையான முன்னேற்றம்.",
    generic: "சின்ன மாற்றம், பெரிய வித்தியாசம்.",
  },
  hi: {
    low: "बढ़िया बेटा, इस बार शिकायत करने को कुछ नहीं! चाय पियो और निकल पड़ो.",
    moderate: "बुरा नहीं है, पर टिकट कटाने से पहले कुछ चीज़ें ठीक करनी होंगी.",
    high: "अरे बाप रे, यह प्लान शाम के ट्रैफिक जाम की तरह फँसा हुआ है! चलो इसे बचाते हैं.",
    factor: {
      budget: { roast: (v) => `बजट ${v.budget}, प्लान ${v.cost}! बाकी पैसे मैं दे दूँ क्या?`, tip: "ख़र्च घटाएँ या बजट बढ़ाएँ; अचानक ख़र्चों के लिए 10–15% बफ़र रखें." },
      schedule: { roast: (v) => `एक दिन में ${v.apd} जगहें? यह छुट्टी है या टीवी क्विज़ शो?`, tip: "रोज़ 1–2 ज़रूरी चीज़ें चुनें; बाक़ी बोनस मानें." },
      fatigue: { roast: (v) => `रोज़ ${v.sleep} घंटे की नींद और ${v.travel} घंटे का सफ़र — फ़ोटो खींचोगे, पर याद कुछ नहीं रहेगा!`, tip: "7–8 घंटे की नींद पक्की करें और रोज़ का सफ़र घटाएँ." },
      transport: { roast: (v) => `${v.days} दिन में ${v.transfers} बार गाड़ी बदलनी? यह सफ़र नहीं, रिले रेस है!`, tip: "सीधे रूट चुनें और पास की जगहें एक साथ देखें." },
    },
    rescue: "रेस्क्यू मोड खोलें — उसी इंजन से दोबारा स्कोर किए गए तीन नए प्लान.",
    solo: "अकेले जा रहे हैं? पहले ही दिन किसी ग्रुप वॉक या क्लास में शामिल हों — दिन में, सार्वजनिक जगह पर लोगों से मिलने का आसान तरीका.",
    places: "ये सामान्य सुझाव हैं; जाने से पहले ताज़ा रिव्यू और समय जाँच लें.",
    alt: "देखिए क्या बदला — भागदौड़ कम, चाय के लिए वक़्त ज़्यादा. यही असली फ़ायदा है.",
    generic: "छोटा बदलाव, बड़ा फ़र्क़.",
  },
};


/** Extra lines: headlines (short punchy verdicts) and the zero-sleep special case. */
export const EXTRA: Record<Language, { headline: Record<RiskLevel, string>; zero: FactorText; zeroHeadline: string; veryLow: string }> = {
  en: {
    headline: { Low: "Fine plan, son. I have nothing to complain about!", Moderate: "Decent plan, but I have a few questions.", High: "This is a recovery leave, not a trip!" },
    zero: { roast: () => "Zero sleep? Son, sightseeing can wait till tomorrow. First, try to stay a human being!", tip: "Sleep is not optional. Block at least 6–7 hours every night before adding any sightseeing." },
    zeroHeadline: "Zero sleep? Sightseeing can wait, son!",
    veryLow: "That little sleep is a safety problem, not a style choice.",
  },
  ml: {
    headline: { Low: "കൊള്ളാം മോനേ, plan ഒക്കെയാ!", Moderate: "Plan കുഴപ്പമില്ല, പക്ഷേ ചില doubts ഉണ്ട്.", High: "ഇത് യാത്രയല്ല മോനേ, recovery leave ആണ് വേണ്ടത്!" },
    zero: { roast: () => "ഉറക്കം ഒട്ടും ഇല്ലെന്നോ? മോനേ, sightseeing നാളെ ചെയ്യാം. ആദ്യം മനുഷ്യനായി ഇരിക്കാൻ നോക്ക്, എന്നിട്ടാകാം trip!", tip: "ഉറക്കം optional അല്ല. ഓരോ രാത്രിയും കുറഞ്ഞത് 6–7 മണിക്കൂർ ഉറക്കം ആദ്യം മാറ്റിവെക്കൂ, എന്നിട്ടേ sightseeing ചേർക്കാവൂ." },
    zeroHeadline: "ഉറക്കം ഇല്ലെങ്കിൽ sightseeing നാളെ, മോനേ!",
    veryLow: "ഇത്ര കുറച്ച് ഉറക്കം ഒരു safety പ്രശ്നമാണ് മോനേ, style അല്ല.",
  },
  ta: {
    headline: { Low: "நல்ல திட்டம் தம்பி, குறை சொல்ல ஒன்றுமில்லை!", Moderate: "திட்டம் ஓகே, ஆனா சில சந்தேகங்கள் இருக்கு.", High: "இது பயணம் இல்ல, ரெக்கவரி லீவு தான் வேணும்!" },
    zero: { roast: () => "தூக்கமே இல்லையா? தம்பி, சுற்றிப்பார்ப்பதை நாளைக்கு வச்சுக்கலாம். முதல்ல மனுஷனா இரு!", tip: "தூக்கம் optional இல்ல. சுற்றிப்பார்ப்பதைச் சேர்க்கும் முன் தினமும் குறைந்தது 6–7 மணி தூக்கத்தை ஒதுக்குங்கள்." },
    zeroHeadline: "தூக்கமே இல்லையா? சுற்றிப்பார்ப்பது நாளைக்கு, தம்பி!",
    veryLow: "இவ்வளவு குறைவான தூக்கம் பாதுகாப்புப் பிரச்சனை, ஸ்டைல் இல்ல.",
  },
  hi: {
    headline: { Low: "बढ़िया प्लान बेटा, कोई शिकायत नहीं!", Moderate: "प्लान ठीक है, पर कुछ सवाल हैं.", High: "यह ट्रिप नहीं, रिकवरी लीव चाहिए!" },
    zero: { roast: () => "नींद बिल्कुल नहीं? बेटा, घूमना कल भी हो जाएगा। पहले इंसान बने रहो!", tip: "नींद optional नहीं है। घूमना जोड़ने से पहले हर रात कम से कम 6–7 घंटे की नींद तय करें." },
    zeroHeadline: "नींद नहीं? घूमना कल होगा, बेटा!",
    veryLow: "इतनी कम नींद सुरक्षा की समस्या है, स्टाइल नहीं.",
  },
};

export function moodFor(trip: Trip, result: ScoreResult): Mood {
  if (trip.sleepHours === 0) return "alarmed";
  if (trip.sleepHours <= SEVERE_SLEEP_MAX || result.score > 80) return "shocked";
  if (result.level === "High") return "worried";
  if (result.level === "Moderate") return "amused";
  return "proud";
}

export function varsFor(trip: Trip): Vars {
  return {
    budget: inr(trip.budgetPerPerson),
    cost: inr(trip.estimatedCost),
    apd: String(Math.round((trip.activities / trip.days) * 10) / 10),
    sleep: String(trip.sleepHours),
    travel: String(trip.travelHoursPerDay),
    transfers: Math.max(trip.transfers, destinationList(trip).length - 1),
    days: trip.days,
  };
}

export function introFor(lang: Language, level: ScoreResult["level"]) {
  const p = T[lang];
  return level === "High" ? p.high : level === "Moderate" ? p.moderate : p.low;
}

export function buildFallbackVerdict(trip: Trip, result: ScoreResult): AmmavanVerdict {
  const p = T[trip.language];
  const x = EXTRA[trip.language];
  const v = varsFor(trip);
  const sorted = [...result.factors].sort((a, b) => b.score - a.score);
  const risky = sorted.filter((f) => f.score >= 35);
  const zero = trip.sleepHours === 0;
  const lines = risky.map((f) => (f.id === "fatigue" && zero ? x.zero.roast(v) : p.factor[f.id].roast(v)));
  // Roast intensity: mild = 1 roast, medium = 2, spicy = 3.
  const count = trip.roast === "mild" ? 1 : trip.roast === "spicy" ? 3 : 2;
  const tipFor = (f: (typeof sorted)[number]) => (f.id === "fatigue" && zero ? x.zero.tip : p.factor[f.id].tip);
  return {
    headline: zero ? x.zeroHeadline : x.headline[result.level],
    mood: moodFor(trip, result),
    verdict: [introFor(trip.language, result.level), ...lines.slice(0, count)].join(" "),
    topRisks: (risky.length ? risky : sorted.slice(0, 1)).slice(0, 3).map((f) => `${f.name} (${f.score}/100): ${f.explanation}`),
    recommendations: sorted.slice(0, 3).map(tipFor),
    rescueAdvice: result.level === "High" ? p.rescue : undefined,
    soloNote: trip.travellerType === "Solo" ? p.solo : undefined,
  };
}
