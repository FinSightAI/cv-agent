import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { extractText } from "@/lib/extract";
import { parsedResumeSchema } from "@/lib/ai/schemas";
import { RESUME_PARSE_SYSTEM } from "@/lib/ai/prompts";
import { MODEL_FAST } from "@/lib/ai/gateway";
import { checkRateLimit, rateLimitResponse, DEFAULT_AI_LIMIT } from "@/lib/rate-limit";
import { dataBlock, withInjectionGuard } from "@/lib/ai/safe-prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "cv-parse", DEFAULT_AI_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const pastedText = (form.get("text") as string | null) ?? null;

  let raw = "";
  let mime = "text/plain";
  let filename: string | undefined;

  if (file) {
    const buf = Buffer.from(await file.arrayBuffer());
    mime = file.type || mime;
    filename = file.name;
    try {
      raw = await extractText(buf, mime, filename);
    } catch (err) {
      return NextResponse.json(
        { error: (err as Error).message },
        { status: 400 },
      );
    }
  } else if (pastedText) {
    raw = pastedText;
  } else {
    return NextResponse.json(
      { error: "No file or text provided" },
      { status: 400 },
    );
  }

  if (!raw || raw.length < 50) {
    return NextResponse.json(
      { error: "Could not extract enough text from input" },
      { status: 400 },
    );
  }

  const { object } = await generateObject({
    model: MODEL_FAST,
    schema: parsedResumeSchema,
    system: withInjectionGuard(RESUME_PARSE_SYSTEM),
    prompt:
      "Parse this resume into structured JSON.\n\n" +
      dataBlock("resume_raw_text", raw),
  });

  return NextResponse.json({
    parsed: object,
    rawText: raw,
    mime,
    filename,
  });
}
