import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const languageCode = body.languageCode === "en-IN" ? "en-IN" : "ml-IN";

    if (!text) {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }
    if (text.length > 2500) {
      return NextResponse.json(
        { error: "Please shorten the verdict to 2500 characters or fewer." },
        { status: 400 }
      );
    }

    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "SARVAM_API_KEY is missing from .env.local." },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey,
      },
      body: JSON.stringify({
        text,
        language_code: languageCode,
        model: "bulbul:v3",
        speaker: "gokul",
        pace: 0.92,
        output_audio_codec: "wav",
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || data?.message || "Sarvam text-to-speech failed." },
        { status: response.status }
      );
    }

    const audioBase64 = data?.audios?.[0];
    if (typeof audioBase64 !== "string" || !audioBase64) {
      return NextResponse.json({ error: "Sarvam returned no audio." }, { status: 502 });
    }

    return NextResponse.json({ audioBase64, languageCode });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected text-to-speech error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
