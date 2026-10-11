import { NextResponse } from "next/server";

export const runtime = "nodejs";

const LANGUAGE_CODES: Record<string, string> = {
  ml: "ml-IN",
  en: "en-IN",
  ta: "ta-IN",
  hi: "hi-IN",
};

/** Generate speech server-side so the Sarvam API key never reaches the browser. */
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const { text, language } = body as { text?: unknown; language?: unknown };
    if (typeof text !== "string" || !text.trim() || text.length > 2500) {
      return NextResponse.json({ error: "Text must contain 1 to 2500 characters." }, { status: 400 });
    }
    if (typeof language !== "string" || !(language in LANGUAGE_CODES)) {
      return NextResponse.json({ error: "Choose a supported language." }, { status: 400 });
    }

    const apiKey = process.env.SARVAM_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "SARVAM_API_KEY is not configured on the server." }, { status: 503 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    let response: Response;
    try {
      response = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": apiKey,
        },
        body: JSON.stringify({
          text: text.trim(),
          model: "bulbul:v3",
          language_code: LANGUAGE_CODES[language],
          speaker: "shubh",
          output_audio_codec: "wav",
          speech_sample_rate: 24000,
          pace: 1.0,
          temperature: 0.6,
        }),
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      const message = error instanceof Error && error.name === "AbortError"
        ? "Speech generation timed out. Please try again."
        : "Could not connect to the speech service. Please try again.";
      return NextResponse.json({ error: message }, { status: 502 });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      // Do not expose upstream response bodies, which may contain provider details.
      const status = response.status === 401 || response.status === 403 ? 502 : response.status === 429 ? 429 : 502;
      const message = response.status === 401 || response.status === 403
        ? "Sarvam rejected the API key. Check your server environment configuration."
        : response.status === 429
          ? "Sarvam speech is rate-limited. Wait a moment and try again."
          : "Sarvam could not generate audio right now. Please try again.";
      return NextResponse.json({ error: message }, { status });
    }

    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !Array.isArray((data as { audios?: unknown }).audios)) {
      return NextResponse.json({ error: "The speech service returned an unreadable response." }, { status: 502 });
    }
    const audioBase64 = (data as { audios: unknown[] }).audios[0];
    if (typeof audioBase64 !== "string" || !audioBase64.length) {
      return NextResponse.json({ error: "The speech service returned no audio." }, { status: 502 });
    }

    const audio = Buffer.from(audioBase64, "base64");
    if (!audio.length) {
      return NextResponse.json({ error: "The generated audio was empty." }, { status: 502 });
    }

    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(audio.byteLength),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Something went wrong while generating Ammavan's voice." }, { status: 500 });
  }
}
