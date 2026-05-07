import * as cheerio from "cheerio";
import type { ConnectorJob } from "./types";

// LinkedIn guest search endpoint — does NOT require login.
// Used by https://www.linkedin.com/jobs/search itself when paginating.
// Format: HTML chunks of job cards. We parse them with cheerio.
//
// IMPORTANT: rate-limit yourself. LinkedIn will start serving CAPTCHA-ish
// 999 responses if you hammer this. One-or-two pages per query is fine.

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/127.0 Safari/537.36";

export type LinkedInSearchOptions = {
  keywords: string;
  location?: string;
  remoteOnly?: boolean;
  recentDays?: 1 | 3 | 7 | 14 | 30;
  pages?: number; // 1 = ~25 results
};

const TPR_MAP = {
  1: "r86400",
  3: "r259200",
  7: "r604800",
  14: "r1209600",
  30: "r2592000",
} as const;

export async function searchLinkedIn(
  opts: LinkedInSearchOptions,
): Promise<ConnectorJob[]> {
  const pages = Math.min(Math.max(opts.pages ?? 1, 1), 3);
  const all: ConnectorJob[] = [];

  for (let p = 0; p < pages; p++) {
    const url = buildSearchUrl(opts, p * 25);
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (res.status === 429 || res.status === 999) {
      throw new Error(
        "LinkedIn מגביל בקשות זמנית. נסה שוב בעוד כמה דקות, או חפש מקור אחר.",
      );
    }
    if (!res.ok) {
      throw new Error(`LinkedIn search failed: ${res.status}`);
    }

    const html = await res.text();
    const cards = parseSearchHtml(html);
    if (cards.length === 0) break;
    all.push(...cards);
  }

  return dedupeBy(all, (j) => j.externalId);
}

function buildSearchUrl(opts: LinkedInSearchOptions, start: number): string {
  const params = new URLSearchParams();
  if (opts.keywords) params.set("keywords", opts.keywords);
  if (opts.location) params.set("location", opts.location);
  if (opts.remoteOnly) params.set("f_WT", "2");
  if (opts.recentDays) params.set("f_TPR", TPR_MAP[opts.recentDays]);
  params.set("start", String(start));
  return `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params.toString()}`;
}

function parseSearchHtml(html: string): ConnectorJob[] {
  const $ = cheerio.load(html);
  const results: ConnectorJob[] = [];

  $("li").each((_, li) => {
    const $li = $(li);
    const card = $li.find(".base-card, .base-search-card, .job-search-card").first();
    if (card.length === 0) return;

    const urn =
      card.attr("data-entity-urn") ??
      $li.attr("data-entity-urn") ??
      "";
    const idMatch = urn.match(/jobPosting:(\d+)/);
    const externalId = idMatch?.[1];
    if (!externalId) return;

    const linkEl = card.find("a.base-card__full-link, a.base-search-card__media").first();
    const url = linkEl.attr("href")?.split("?")[0] ?? `https://www.linkedin.com/jobs/view/${externalId}`;

    const title =
      card.find(".base-search-card__title, h3").first().text().trim() ||
      undefined;
    const company =
      card.find(".base-search-card__subtitle, h4 a, h4").first().text().trim() ||
      undefined;
    const location =
      card.find(".job-search-card__location").first().text().trim() ||
      undefined;
    const postedAt =
      card.find("time").first().attr("datetime") ?? undefined;

    if (!title || !company) return;

    results.push({
      externalId,
      title,
      company,
      location,
      remote: /remote/i.test(location ?? ""),
      url,
      postedAt,
      source: "linkedin",
    });
  });

  return results;
}

function dedupeBy<T>(arr: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}
