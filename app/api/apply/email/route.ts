import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { coverLetterToHtml } from "@/lib/cv-export";

export const runtime = "nodejs";
export const maxDuration = 30;

const inputSchema = z.object({
  to: z.string().email(),
  jobTitle: z.string(),
  company: z.string(),
  applicantName: z.string().optional(),
  coverLetter: z.string().optional(),
  tailoredCvMd: z.string().optional(),
  lang: z.enum(["he", "en"]).default("he"),
});

export async function POST(req: NextRequest) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { to, jobTitle, company, applicantName, coverLetter, tailoredCvMd, lang } = parsed.data;

  const subject =
    lang === "he"
      ? `מועמדות לתפקיד ${jobTitle} ב-${company}`
      : `Application for ${jobTitle} at ${company}`;

  const fromName = applicantName ?? "Jobos Applicant";
  const safeTitle = jobTitle.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeCompany = company.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Build HTML body
  let htmlBody = "";
  if (coverLetter) {
    htmlBody = coverLetterToHtml(coverLetter, lang, jobTitle, company);
  } else {
    const greeting = lang === "he"
      ? `<p>שלום,<br>אני מגיש/ה מועמדות לתפקיד <strong>${safeTitle}</strong> ב-<strong>${safeCompany}</strong>.</p>`
      : `<p>Hello,<br>I am applying for the <strong>${safeTitle}</strong> position at <strong>${safeCompany}</strong>.</p>`;
    htmlBody = `<!DOCTYPE html><html><body dir="${lang === "he" ? "rtl" : "ltr"}">${greeting}</body></html>`;
  }

  // Attach tailored CV as plain text if available
  const attachments = tailoredCvMd
    ? [
        {
          filename: `CV-${company}-${jobTitle}.md`.replace(/[^\w\-. ]/g, "").slice(0, 80),
          content: Buffer.from(tailoredCvMd, "utf-8"),
          contentType: "text/markdown; charset=utf-8",
        },
      ]
    : [];

  const resend = new Resend(resendKey);
  const { error } = await resend.emails.send({
    from: `${fromName} <onboarding@resend.dev>`,
    to,
    subject,
    html: htmlBody,
    attachments,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
