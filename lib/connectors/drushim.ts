import * as cheerio from "cheerio";
import type { ConnectorJob } from "./types";

// Drushim.co.il — Israel's largest job board. Public RSS feed.
// Keywords in Hebrew or English supported.
const BASE = "https://www.drushim.co.il/rss/jobs?q={q}";

export type DrushimSearchOptions = {
  keywords: string;
  maxResults?: number;
};

export async function searchDrushim(
  opts: DrushimSearchOptions,
): Promise<ConnectorJob[]> {
  const url = BASE.replace("{q}", encodeURIComponent(opts.keywords));
  const max = opts.maxResults ?? 40;

  const res = await fetch(url, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml, */*",
      "User-Agent": "Mozilla/5.0 (compatible; CV-Agent/1.0)",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Drushim RSS error: ${res.status}`);
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
    const link =
      $(el).find("link").first().text().trim() ||
      $(el).find("guid").first().text().trim();
    const description = $(el).find("description").first().text().trim();
    const pubDate = $(el).find("pubDate").first().text().trim();

    if (!title || !link) return;

    const { company, location } = parseFields($, el, description, title);

    jobs.push({
      externalId: `drushim-${encodeURIComponent(link)}`,
      title,
      company,
      location,
      url: link,
      description: description.replace(/<[^>]+>/g, " ").trim().slice(0, 500),
      postedAt: pubDate ? new Date(pubDate).toISOString() : undefined,
      source: "drushim" as const,
    });
  });

  return jobs;
}

function parseFields(
  $: ReturnType<typeof cheerio.load>,
  el: cheerio.Element,
  desc: string,
  title: string,
): { company: string; location?: string } {
  // Some feeds expose <dc:creator> or <author> for company
  const author =
    $(el).find("creator").first().text().trim() ||
    $(el).find("author").first().text().trim();
  if (author) {
    const plain = desc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const locMatch = plain.match(/(?:מיקום|Location)[:\s]+([^\n,|]{2,40})/i);
    return { company: author, location: locMatch?.[1]?.trim() };
  }

  // Fallback: try to parse from description text
  const plain = desc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const match = plain.match(/^([^|\-–—•,]{2,60})[|\-–—•,]\s*([^|\-–—•,]{2,40})/);
  if (match) {
    return { company: match[1].trim(), location: match[2].trim() };
  }
  return { company: plain.slice(0, 60) || title };
}
