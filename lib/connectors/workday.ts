import type { ConnectorJob } from "./types";

// Workday public job-board JSON endpoint (no auth).
// URL pattern: https://{sub}.{region}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
//
// You can derive {sub}, {tenant}, {site} from any company's career URL, e.g.:
//   https://siemens.wd1.myworkdayjobs.com/Siemens_Careers
//   → sub=siemens, region=wd1, tenant=siemens, site=Siemens_Careers
//
// Workday is POST-based with a body that supports pagination + facets.

type WorkdayJob = {
  title: string;
  externalPath: string; // /job/{location}/{slug}_{ref}
  bulletFields?: string[];
  postedOn?: string;
  locationsText?: string;
};

type WorkdayResponse = {
  total: number;
  jobPostings: WorkdayJob[];
};

export type WorkdayCoords = {
  origin: string; // https://siemens.wd1.myworkdayjobs.com
  tenant: string; // siemens
  site: string;   // Siemens_Careers
};

export function parseWorkdayUrl(input: string): WorkdayCoords | null {
  try {
    const url = new URL(input.trim());
    if (!/myworkdayjobs\.com$/i.test(url.hostname)) return null;
    const sub = url.hostname.split(".")[0];
    // Path forms:
    //   /{site}                                    → tenant from sub
    //   /{tenant}/{site}                           → both explicit
    //   /wday/cxs/{tenant}/{site}/...              → already coordinates
    const parts = url.pathname.split("/").filter(Boolean);
    let tenant = sub;
    let site: string | undefined;
    if (parts[0] === "wday" && parts[1] === "cxs") {
      tenant = parts[2];
      site = parts[3];
    } else if (parts.length >= 2) {
      tenant = parts[0];
      site = parts[1];
    } else if (parts.length === 1) {
      site = parts[0];
    }
    if (!site) return null;
    return { origin: url.origin, tenant, site };
  } catch {
    return null;
  }
}

export async function listWorkdayJobs(
  coords: WorkdayCoords,
  searchText = "",
  limit = 50,
): Promise<ConnectorJob[]> {
  const apiUrl = `${coords.origin}/wday/cxs/${encodeURIComponent(coords.tenant)}/${encodeURIComponent(coords.site)}/jobs`;
  const all: ConnectorJob[] = [];
  let offset = 0;

  while (true) {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        appliedFacets: {},
        limit,
        offset,
        searchText,
      }),
    });
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`לא נמצא לוח Workday עבור ${coords.tenant}/${coords.site}`);
      }
      throw new Error(`Workday API error: ${res.status}`);
    }
    const data = (await res.json()) as WorkdayResponse;
    const company = prettify(coords.tenant);

    for (const j of data.jobPostings) {
      all.push({
        externalId: j.externalPath,
        title: j.title,
        company,
        location: j.locationsText,
        remote:
          /remote/i.test(j.locationsText ?? "") ||
          (j.bulletFields?.some((b) => /remote/i.test(b)) ?? false),
        url: `${coords.origin}${j.externalPath}`,
        postedAt: j.postedOn,
        source: "workday",
      });
    }

    if (all.length >= data.total || data.jobPostings.length === 0) break;
    offset += limit;
    if (offset >= 500) break; // safety
  }

  return all;
}

function prettify(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/[-_]/g, " ");
}

export async function fetchWorkdayJobDetail(
  coords: WorkdayCoords,
  externalPath: string,
): Promise<string> {
  const url = `${coords.origin}/wday/cxs/${encodeURIComponent(coords.tenant)}/${encodeURIComponent(coords.site)}${externalPath}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Workday detail fetch failed: ${res.status}`);
  const data = (await res.json()) as {
    jobPostingInfo?: {
      title: string;
      jobDescription?: string | null;
      location?: string;
    };
  };
  const info = data.jobPostingInfo;
  if (!info) throw new Error("Workday detail malformed");
  return [info.title, info.location, "", info.jobDescription ? stripHtml(info.jobDescription) : ""]
    .filter(Boolean)
    .join("\n");
}

function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|div|li|h\d|br)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
