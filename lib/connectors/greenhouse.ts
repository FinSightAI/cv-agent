import type { ConnectorJob } from "./types";

// Greenhouse public job-board API. Free, no auth.
// https://developers.greenhouse.io/job-board.html
// `token` is the company's board slug (e.g. "vercel" → boards.greenhouse.io/vercel).

type GreenhouseJob = {
  id: number;
  title: string;
  absolute_url: string;
  location: { name: string };
  updated_at: string;
  content?: string;
};

type GreenhouseJobDetail = GreenhouseJob & {
  content: string; // HTML
};

export async function listGreenhouseJobs(token: string): Promise<ConnectorJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`לא נמצא לוח משרות "${token}" ב-Greenhouse`);
    }
    throw new Error(`Greenhouse API error: ${res.status}`);
  }
  const data = (await res.json()) as { jobs: GreenhouseJob[] };
  return data.jobs.map((j) => ({
    externalId: String(j.id),
    title: j.title,
    company: prettifyToken(token),
    location: j.location?.name,
    remote: /remote/i.test(j.location?.name ?? ""),
    url: j.absolute_url,
    description: stripHtml(j.content ?? ""),
    postedAt: j.updated_at,
    source: "greenhouse",
  }));
}

export async function getGreenhouseJob(
  token: string,
  jobId: string,
): Promise<string> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs/${encodeURIComponent(jobId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Greenhouse job fetch failed: ${res.status}`);
  const data = (await res.json()) as GreenhouseJobDetail;
  return stripHtml(data.content);
}

function prettifyToken(token: string): string {
  return token.charAt(0).toUpperCase() + token.slice(1).replace(/-/g, " ");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|li|h\d|br)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}
