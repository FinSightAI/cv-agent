import * as cheerio from "cheerio";
import type { ConnectorJob } from "./types";

// AllJobs (Israel) RSS feed — public, no auth required.
// Supports Hebrew keywords. Returns up to 40 results per query.
const BASE =
  "https://www.alljobs.co.il/SearchResultsRss.aspx?position={q}&region=0&jobtype=0&industry=0";

export type AllJobsSearchOptions = {
  keywords: string;
  maxResults?: number;
};

export async function searchAllJobs(
  opts: AllJobsSearchOptions,
): Promise<ConnectorJob[]> {
  const url = BASE.replace("{q}", encodeURIComponent(opts.keywords));
  const max = opts.maxResults ?? 40;

  const res = await fetch(url, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml, */*",
      "User-Agent": "Mozilla/5.0 (compatible; CV-Agent/1.0)",
    },
    next: { revalidate: 3600 }, // cache 1hr server-side
  });

  if (!res.ok) {
    throw new Error(`AllJobs RSS error: ${res.status}`);
  }

  const xml = await res.text();
  return parseRss(xml, max);
}

function parseRss(xml: string, max: number): ConnectorJob[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const jobs: ConnectorJob[] = [];

  $("item").each((_, el) => {
    if (jobs.length >= max) return false;
    const title = $(el).find("title").first().text().trim();
    const link = $(el).find("link").first().text().trim() || $(el).find("guid").first().text().trim();
    const description = $(el).find("description").first().text().trim();
    const pubDate = $(el).find("pubDate").first().text().trim();

    if (!title || !link) return;

    // Description often contains: Company • Location • job type
    const { company, location } = parseDescription(description, title);

    jobs.push({
      externalId: `alljobs-${encodeURIComponent(link)}`,
      title,
      company,
      location,
      url: link,
      description: description.slice(0, 500),
      postedAt: pubDate ? new Date(pubDate).toISOString() : undefined,
      source: "alljobs",
    });
  });

  return jobs;
}

function parseDescription(
  desc: string,
  title: string,
): { company: string; location?: string } {
  // AllJobs description often starts with HTML or "Company name - Location"
  const plain = desc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  // Try to extract "Company | City" or "Company - City"
  const match = plain.match(/^([^|\-–—•,]{2,60})[|\-–—•,]\s*([^|\-–—•,]{2,40})/);
  if (match) {
    return {
      company: match[1].trim(),
      location: match[2].trim(),
    };
  }
  return { company: plain.slice(0, 60) || title };
}
