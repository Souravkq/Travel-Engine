// Verifies your Sarvam setup WITHOUT printing your key.
// Run:  npm run check:sarvam
import { readFileSync, existsSync } from "node:fs";

// Minimal .env.local loader (so you don't need extra packages).
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
} else {
  console.log("✗ .env.local not found in this folder. It must be in the project root (next to package.json).");
  process.exit(1);
}

const key = process.env.SARVAM_API_KEY?.trim();
const model = process.env.SARVAM_MODEL?.trim() || "sarvam-105b-conversations";
console.log(`SARVAM_API_KEY : ${key ? `set (${key.length} characters, hidden)` : "MISSING"}`);
console.log(`SARVAM_MODEL   : ${model}${process.env.SARVAM_MODEL ? "" : "  (default; not set in .env.local)"}`);
if (!key) process.exit(1);

const res = await fetch("https://api.sarvam.ai/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", "api-subscription-key": key },
  body: JSON.stringify({
    model,
    messages: [{ role: "user", content: "Reply with one short Malayalam sentence greeting a traveller." }],
    max_tokens: 300,
    reasoning_effort: "low",
  }),
}).catch((e) => { console.log("✗ Network error:", e.message); process.exit(1); });

console.log(`HTTP status    : ${res.status}`);
if (res.status === 403) console.log("✗ Sarvam says the key is invalid/forbidden (it returns 403 for bad keys). Re-create the key in the dashboard.");
else if (res.status === 429) console.log("✗ Rate limited or out of credits. Check your Sarvam dashboard.");
else if (res.status === 400 || res.status === 422) console.log("✗ Request rejected. Check SARVAM_MODEL is exactly: sarvam-105b-conversations (or sarvam-105b).");
else if (!res.ok) console.log("✗ Unexpected error from Sarvam.");
else {
  const data = await res.json();
  console.log("✓ Sarvam answered:", data.choices?.[0]?.message?.content?.slice(0, 200));
}
process.exit(res.ok ? 0 : 1);
