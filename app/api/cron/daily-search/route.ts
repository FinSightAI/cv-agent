import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { searchLinkedIn } from "@/lib/connectors/linkedin-search";
import { searchAllJobs } from "@/lib/connectors/alljobs";
import { searchDrushim } from "@/lib/connectors/drushim";
import type { ConnectorJob } from "@/lib/connectors/types";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function GET(req: NextRequest) {
  // Protect with CRON_SECRET so only Vercel Cron can call this
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = process.env.DAILY_ALERT_EMAIL;
  const rolesRaw = process.env.DAILY_ALERT_ROLES ?? "";
  const location = process.env.DAILY_ALERT_LOCATION ?? "Israel";
  const resendKey = process.env.RESEND_API_KEY;

  if (!email) {
    return NextResponse.json({ error: "DAILY_ALERT_EMAIL not set" }, { status: 500 });
  }
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  const roles = rolesRaw
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  if (roles.length === 0) {
    return NextResponse.json({ error: "DAILY_ALERT_ROLES not set" }, { status: 500 });
  }

  const keywords = roles.slice(0, 3).join(" OR ");

  // Run LinkedIn + AllJobs + Drushim in parallel, tolerate individual failures
  const [linkedInResult, allJobsResult, drushimResult] = await Promise.all([
    searchLinkedIn({ keywords, location, recentDays: 1, pages: 2 })
      .catch(() => [] as ConnectorJob[]),
    searchAllJobs({ keywords, maxResults: 30 })
      .catch(() => [] as ConnectorJob[]),
    searchDrushim({ keywords, maxResults: 30 })
      .catch(() => [] as ConnectorJob[]),
  ]);

  const jobs = dedup([...linkedInResult, ...allJobsResult, ...drushimResult]);

  if (jobs.length === 0) {
    return NextResponse.json({ sent: false, reason: "no new jobs" });
  }

  const resend = new Resend(resendKey);
  const { error } = await resend.emails.send({
    from: "Jobos <alerts@cv-agent-opal.vercel.app>",
    to: email,
    subject: `Jobos — ${jobs.length} משרות חדשות ${new Date().toLocaleDateString("he-IL")}`,
    html: buildEmailHtml(jobs, roles, location),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sent: true, count: jobs.length });
}

function dedup(jobs: ConnectorJob[]): ConnectorJob[] {
  const seen = new Set<string>();
  return jobs.filter((j) => {
    const key = `${j.company}-${j.title}`.toLowerCase().replace(/\s+/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildEmailHtml(
  jobs: ConnectorJob[],
  roles: string[],
  location: string,
): string {
  const rows = jobs
    .slice(0, 25)
    .map(
      (j) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0">
        <a href="${j.url}" style="font-weight:600;color:#6d28d9;text-decoration:none">${j.title}</a><br>
        <span style="color:#555;font-size:13px">${j.company}${j.location ? ` · ${j.location}` : ""}</span>
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;white-space:nowrap">
        <span style="display:inline-block;background:${sourceColor(j.source)};color:#fff;border-radius:4px;padding:2px 7px;font-size:11px">${j.source}</span>
      </td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:system-ui,sans-serif;direction:rtl">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">
  <div style="background:linear-gradient(135deg,#6d28d9,#a855f7);border-radius:12px;padding:24px;margin-bottom:20px;color:#fff">
    <h1 style="margin:0 0 6px;font-size:22px">✨ Jobos — דיילי דיג'סט</h1>
    <p style="margin:0;opacity:.85;font-size:14px">
      ${jobs.length} משרות חדשות ל: ${roles.join(", ")} · ${location}
    </p>
  </div>
  <div style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px">
      ${rows}
    </table>
  </div>
  <p style="text-align:center;color:#999;font-size:12px;margin-top:20px">
    <a href="https://cv-agent-opal.vercel.app/jobs" style="color:#6d28d9">פתח את Jobos</a> ·
    <a href="https://cv-agent-opal.vercel.app/settings" style="color:#999;text-decoration:none">הגדרות</a>
  </p>
</div>
</body>
</html>`;
}

function sourceColor(source: string): string {
  const colors: Record<string, string> = {
    linkedin: "#0a66c2",
    alljobs: "#e65c00",
    workday: "#5c4ee5",
  };
  return colors[source] ?? "#555";
}
