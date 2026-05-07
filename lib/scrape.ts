import * as cheerio from "cheerio";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/127.0 Safari/537.36";

export async function fetchJobPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,he;q=0.8",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch (${res.status}): ${url}`);
  }

  const html = await res.text();
  return cleanHtml(html);
}

function cleanHtml(html: string): string {
  const $ = cheerio.load(html);

  $(
    "script, style, noscript, iframe, svg, header, footer, nav, .cookie, .banner",
  ).remove();

  // Greenhouse: #content #app_body, Lever: .posting-page, Ashby: ._description
  const candidates = [
    "#content",
    "main",
    "[role=main]",
    "#app_body",
    ".posting-page",
    "._description_",
    ".job-description",
    ".description",
    "article",
  ];

  for (const sel of candidates) {
    const el = $(sel).first();
    if (el.length && el.text().trim().length > 400) {
      return collapse(el.text());
    }
  }

  return collapse($("body").text());
}

function collapse(s: string): string {
  return s
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
