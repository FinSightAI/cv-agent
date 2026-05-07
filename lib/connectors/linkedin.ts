import * as cheerio from "cheerio";

// LinkedIn job pages embed structured data via JSON-LD (schema.org/JobPosting).
// This is publicly visible without login. Use it for accurate parsing
// before falling back to plain HTML text.
//
// LinkedIn URL forms:
//   https://www.linkedin.com/jobs/view/{jobId}
//   https://www.linkedin.com/jobs/view/{slug}-{jobId}
//   https://www.linkedin.com/jobs/collections/...?currentJobId={jobId}
//
// We can't bulk-list jobs without auth — that intentionally violates ToS.

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/127.0 Safari/537.36";

export function isLinkedInJobUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return /(^|\.)linkedin\.com$/i.test(u.hostname) && /\/jobs\//.test(u.pathname);
  } catch {
    return false;
  }
}

function extractJobId(url: string): string | null {
  try {
    const u = new URL(url);
    const fromQuery = u.searchParams.get("currentJobId");
    if (fromQuery && /^\d+$/.test(fromQuery)) return fromQuery;
    const m = u.pathname.match(/\/jobs\/view\/(?:[^/]*?-)?(\d+)/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

type JobPostingLd = {
  "@type"?: string | string[];
  title?: string;
  description?: string;
  hiringOrganization?: { name?: string } | string;
  jobLocation?:
    | {
        address?: { addressLocality?: string; addressRegion?: string; addressCountry?: string };
      }
    | { address?: { addressLocality?: string } }[];
  employmentType?: string;
  jobLocationType?: string;
  datePosted?: string;
  baseSalary?: { value?: { minValue?: number; maxValue?: number; unitText?: string }; currency?: string };
  validThrough?: string;
};

export type LinkedInParsed = {
  title?: string;
  company?: string;
  location?: string;
  remote?: boolean;
  description: string;
  postedAt?: string;
  url: string;
};

export async function fetchLinkedInJob(url: string): Promise<LinkedInParsed> {
  const guestUrl = toGuestUrl(url);
  const res = await fetch(guestUrl, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`LinkedIn fetch failed: ${res.status}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const ld = extractJsonLd($);

  const title = ld?.title ?? cleanText($("h1").first().text()) ?? undefined;
  const company =
    typeof ld?.hiringOrganization === "string"
      ? ld.hiringOrganization
      : ld?.hiringOrganization?.name ??
        cleanText($("a.topcard__org-name-link, .topcard__org-name-link, .topcard__flavor a").first().text()) ??
        cleanText($(".topcard__flavor").first().text());
  const location =
    extractLdLocation(ld) ??
    cleanText(
      $(".topcard__flavor--bullet, .topcard__flavor.topcard__flavor--bullet").first().text(),
    );
  const description =
    cleanText(ld?.description ?? "") ||
    cleanText(
      $(".description__text, .show-more-less-html__markup").first().html() ?? "",
      true,
    ) ||
    cleanText($("body").text(), false, 8000);

  const remote =
    ld?.jobLocationType === "TELECOMMUTE" ||
    /remote/i.test(location ?? "") ||
    /\bremote\b/i.test(description.slice(0, 600));

  return {
    title,
    company,
    location,
    remote,
    description,
    postedAt: ld?.datePosted,
    url,
  };
}

function toGuestUrl(input: string): string {
  // The /jobs-guest/jobs/api/jobPosting endpoint returns a barebones, unauth-friendly version.
  const id = extractJobId(input);
  if (id) {
    return `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}`;
  }
  return input;
}

function extractJsonLd($: cheerio.CheerioAPI): JobPostingLd | null {
  let found: JobPostingLd | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (found) return;
    const raw = $(el).contents().text();
    try {
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of arr) {
        const t = (item as JobPostingLd)["@type"];
        const isJob =
          t === "JobPosting" || (Array.isArray(t) && t.includes("JobPosting"));
        if (isJob) {
          found = item as JobPostingLd;
          break;
        }
      }
    } catch {
      // skip
    }
  });
  return found;
}

function extractLdLocation(ld: JobPostingLd | null): string | undefined {
  if (!ld?.jobLocation) return undefined;
  const arr = Array.isArray(ld.jobLocation) ? ld.jobLocation : [ld.jobLocation];
  const first = arr[0];
  const addr = (first as { address?: { addressLocality?: string; addressRegion?: string; addressCountry?: string } }).address;
  if (!addr) return undefined;
  return [addr.addressLocality, addr.addressRegion, addr.addressCountry]
    .filter(Boolean)
    .join(", ");
}

function cleanText(s: string, isHtml = false, max = 20000): string {
  let out = s;
  if (isHtml) {
    out = out
      .replace(/<\/(p|div|li|h\d|br)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, "");
  }
  return out
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}
