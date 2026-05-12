import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { fetchJobPage } from "@/lib/scrape";
import { fetchLinkedInJob, isLinkedInJobUrl } from "@/lib/connectors/linkedin";
import { parsedJobSchema } from "@/lib/ai/schemas";
import { JOB_PARSE_SYSTEM } from "@/lib/ai/prompts";
import { MODEL_FAST } from "@/lib/ai/gateway";
import { checkRateLimit, rateLimitResponse, DEFAULT_AI_LIMIT } from "@/lib/rate-limit";
import { dataBlock, withInjectionGuard } from "@/lib/ai/safe-prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "jobs-parse", DEFAULT_AI_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const body = await req.json().catch(() => ({}));
  const { url, text } = body as { url?: string; text?: string };

  let raw = "";
  let sourceUrl: string | undefined;
  let hint: { title?: string; company?: string; location?: string; remote?: boolean } | undefined;

  if (url) {
    try {
      if (isLinkedInJobUrl(url)) {
        const li = await fetchLinkedInJob(url);
        raw = [
          li.title ?? "",
          li.company ?? "",
          li.location ?? "",
          li.remote ? "Remote" : "",
          "",
          li.description,
        ]
          .filter(Boolean)
          .join("\n");
        hint = {
          title: li.title,
          company: li.company,
          location: li.location,
          remote: li.remote,
        };
      } else {
        raw = await fetchJobPage(url);
      }
      sourceUrl = url;
    } catch (err) {
      return NextResponse.json(
        {
          error: `Failed to fetch job posting: ${(err as Error).message}. Try pasting the text instead.`,
          code: "fetch_failed",
        },
        { status: 400 },
      );
    }
  } else if (text) {
    raw = text;
  } else {
    return NextResponse.json(
      { error: "Provide url or text", code: "missing_input" },
      { status: 400 },
    );
  }

  if (raw.length < 80) {
    return NextResponse.json(
      { error: "Posting content is too short", code: "content_too_short" },
      { status: 400 },
    );
  }

  const promptParts = [
    `Source URL: ${sourceUrl ?? "(pasted text)"}`,
    hint ? "Pre-extracted fields (prefer these for title/company/location):\n" + dataBlock("pre_extracted", hint) : "",
    "",
    dataBlock("posting_content", raw.slice(0, 18000)),
  ].filter(Boolean);

  const { object } = await generateObject({
    model: MODEL_FAST,
    schema: parsedJobSchema,
    system: withInjectionGuard(JOB_PARSE_SYSTEM),
    prompt: promptParts.join("\n"),
  });

  return NextResponse.json({
    parsed: object,
    rawText: raw,
    url: sourceUrl,
  });
}
