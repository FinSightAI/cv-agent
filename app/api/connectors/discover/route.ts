import { NextRequest, NextResponse } from "next/server";
import { listGreenhouseJobs } from "@/lib/connectors/greenhouse";
import { listLeverJobs } from "@/lib/connectors/lever";
import {
  listWorkdayJobs,
  parseWorkdayUrl,
} from "@/lib/connectors/workday";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

const inputSchema = z.object({
  source: z.enum(["greenhouse", "lever", "workday"]),
  token: z.string().min(1).max(500),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { source, token } = parsed.data;

  try {
    let jobs;
    if (source === "greenhouse") {
      jobs = await listGreenhouseJobs(token);
    } else if (source === "lever") {
      jobs = await listLeverJobs(token);
    } else {
      const coords = parseWorkdayUrl(token);
      if (!coords) {
        return NextResponse.json(
          {
            error:
              "Workday URL לא תקין. הדבק URL של דף קריירה (לדוגמה: https://siemens.wd1.myworkdayjobs.com/Siemens_Careers).",
          },
          { status: 400 },
        );
      }
      jobs = await listWorkdayJobs(coords);
    }
    return NextResponse.json({ jobs });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}
