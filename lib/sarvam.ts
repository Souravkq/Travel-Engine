/**
 * Sarvam AI client. SERVER-ONLY: import this from route handlers only.
 *
 * Verified against the official docs (checked while building this):
 *   - Endpoint : POST https://api.sarvam.ai/v1/chat/completions
 *                (V1 serves only `sarvam-105b` and `sarvam-105b-conversations`)
 *   - Auth     : `api-subscription-key: <key>` header (docs say prefer this over Bearer)
 *   - Body     : { model, messages:[{role,content}], temperature, max_tokens,
 *                  reasoning_effort?, response_format? }
 *   - Response : choices[0].message.content
 *   - Errors   : auth failures are HTTP 403 (not 401); 429 = rate limited;
 *                400/422 = bad request.
 * Docs: https://docs.sarvam.ai/api-reference/chat/chat-completions-v1
 */
import type { AmmavanErrorCode } from "./types";

const DEFAULT_ENDPOINT = "https://api.sarvam.ai/v1/chat/completions";
export const DEFAULT_MODEL = "sarvam-105b-conversations";
const TIMEOUT_MS = 30_000;

export function sarvamModel() {
  return process.env.SARVAM_MODEL?.trim() || DEFAULT_MODEL;
}
export function sarvamConfigured() {
  return Boolean(process.env.SARVAM_API_KEY?.trim());
}
/** Safe to expose: never includes the key itself. */
export function sarvamStatus() {
  return { configured: sarvamConfigured(), model: sarvamModel() };
}
function endpoint() {
  // Test hook only: lets automated tests point at a local mock. Ignored in production.
  if (process.env.NODE_ENV !== "production" && process.env.SARVAM_TEST_ENDPOINT) return process.env.SARVAM_TEST_ENDPOINT;
  return DEFAULT_ENDPOINT;
}

export class SarvamError extends Error {
  constructor(public code: AmmavanErrorCode, public status?: number) {
    super(code);
  }
}

function codeForStatus(status: number): AmmavanErrorCode {
  if (status === 403 || status === 401) return "invalid_key";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server_error";
  return "bad_response";
}

async function post(body: Record<string, unknown>, key: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-subscription-key": key },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (e) {
    throw new SarvamError(e instanceof Error && e.name === "AbortError" ? "timeout" : "network");
  } finally {
    clearTimeout(timer);
  }
}

export async function sarvamChat(system: string, user: string, opts: { maxTokens?: number; temperature?: number } = {}): Promise<string> {
  const key = process.env.SARVAM_API_KEY?.trim();
  if (!key) throw new SarvamError("not_configured");

  const base = {
    model: sarvamModel(),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: opts.temperature ?? 0.85,
  };
  // First try with tuning options: low reasoning effort (so reasoning tokens don't eat the
  // answer), a generous token cap, and JSON mode. If the API rejects them (400/422), retry plain.
  let res = await post({ ...base, max_tokens: opts.maxTokens ?? 3000, reasoning_effort: "low", response_format: { type: "json_object" } }, key);
  if (res.status === 400 || res.status === 422) {
    console.warn(`[ammavan] optional parameters rejected (HTTP ${res.status}); retrying without them`);
    res = await post({ ...base, max_tokens: opts.maxTokens ?? 3000 }, key);
  }
  if (!res.ok) throw new SarvamError(codeForStatus(res.status), res.status);

  let data: { choices?: { message?: { content?: unknown } }[] };
  try {
    data = await res.json();
  } catch {
    throw new SarvamError("bad_response");
  }
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new SarvamError("bad_response");
  return text;
}

/** Pulls the first JSON object out of a model reply (handles <think> blocks and code fences). */
export function extractJson(text: string): unknown | null {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```(?:json)?/gi, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Safe logging: only an error code and HTTP status. Never keys, headers, prompts or trip data. */
export function logSarvamIssue(where: string, e: unknown) {
  const code = e instanceof SarvamError ? e.code : e instanceof Error ? e.message : "unknown";
  const status = e instanceof SarvamError && e.status ? ` (HTTP ${e.status})` : "";
  console.warn(`[ammavan] ${where} failed: ${code}${status}`);
}
export function errorCodeOf(e: unknown): AmmavanErrorCode {
  return e instanceof SarvamError ? e.code : "bad_response";
}
