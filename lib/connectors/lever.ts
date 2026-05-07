import type { ConnectorJob } from "./types";

// Lever public posting feed (no auth).
// https://api.lever.co/v0/postings/{company}?mode=json

type LeverPosting = {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  createdAt: number;
  description?: string;
  descriptionPlain?: string;
  additional?: string;
  additionalPlain?: string;
  categories?: {
    location?: string;
    team?: string;
    department?: string;
    commitment?: string;
  };
  workplaceType?: string;
  lists?: { text: string; content: string }[];
};

export async function listLeverJobs(company: string): Promise<ConnectorJob[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(company)}?mode=json`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`לא נמצא לוח משרות "${company}" ב-Lever`);
    }
    throw new Error(`Lever API error: ${res.status}`);
  }
  const data = (await res.json()) as LeverPosting[];
  return data.map((j) => ({
    externalId: j.id,
    title: j.text,
    company: prettifyToken(company),
    location: j.categories?.location,
    remote: j.workplaceType === "remote" || /remote/i.test(j.categories?.location ?? ""),
    url: j.hostedUrl,
    description: composeDescription(j),
    postedAt: new Date(j.createdAt).toISOString(),
    source: "lever",
  }));
}

function composeDescription(p: LeverPosting): string {
  const parts: string[] = [];
  if (p.descriptionPlain) parts.push(p.descriptionPlain);
  if (p.lists?.length) {
    for (const l of p.lists) {
      parts.push(`\n${l.text}\n${stripHtml(l.content)}`);
    }
  }
  if (p.additionalPlain) parts.push(p.additionalPlain);
  return parts.join("\n").trim();
}

function prettifyToken(token: string): string {
  return token.charAt(0).toUpperCase() + token.slice(1).replace(/-/g, " ");
}

function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|div|li|h\d|br)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
