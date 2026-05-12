import { google, type Auth } from "googleapis";

export type RawEmail = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to?: string;
  date?: string;
  snippet: string;
  body: string;
  unread: boolean;
};

export async function listMessages(
  auth: Auth.OAuth2Client,
  query: string,
  maxResults = 30,
): Promise<RawEmail[]> {
  const gmail = google.gmail({ version: "v1", auth });
  const list = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  });
  const ids = (list.data.messages ?? []).map((m: import("googleapis").gmail_v1.Schema$Message) => m.id!).filter(Boolean);
  if (ids.length === 0) return [];

  // Fetch in parallel; cap concurrency lightly.
  const out: RawEmail[] = [];
  for (let i = 0; i < ids.length; i += 8) {
    const batch = ids.slice(i, i + 8);
    const msgs = await Promise.all(
      batch.map((id: string) =>
        gmail.users.messages.get({
          userId: "me",
          id,
          format: "full",
        }),
      ),
    );
    for (const m of msgs) {
      out.push(parseMessage(m.data));
    }
  }
  return out;
}

function parseMessage(m: import("googleapis").gmail_v1.Schema$Message): RawEmail {
  const headers = m.payload?.headers ?? [];
  const get = (n: string) =>
    headers.find((h) => h.name?.toLowerCase() === n.toLowerCase())?.value ?? "";

  const subject = get("Subject");
  const from = get("From");
  const to = get("To");
  const date = get("Date");
  const labels = m.labelIds ?? [];

  const body = extractBody(m.payload).slice(0, 6000);

  return {
    id: m.id!,
    threadId: m.threadId!,
    subject,
    from,
    to,
    date,
    snippet: (m.snippet ?? "").trim(),
    body,
    unread: labels.includes("UNREAD"),
  };
}

function extractBody(
  payload: import("googleapis").gmail_v1.Schema$MessagePart | undefined,
): string {
  if (!payload) return "";
  // Prefer text/plain part; fall back to text/html stripped.
  const parts: import("googleapis").gmail_v1.Schema$MessagePart[] = [];
  walk(payload, parts);

  const plain = parts.find((p) => p.mimeType === "text/plain" && p.body?.data);
  if (plain?.body?.data) {
    return decodeB64Url(plain.body.data);
  }
  const html = parts.find((p) => p.mimeType === "text/html" && p.body?.data);
  if (html?.body?.data) {
    return stripHtml(decodeB64Url(html.body.data));
  }
  if (payload.body?.data) {
    return decodeB64Url(payload.body.data);
  }
  return "";
}

function walk(
  p: import("googleapis").gmail_v1.Schema$MessagePart,
  out: import("googleapis").gmail_v1.Schema$MessagePart[],
) {
  out.push(p);
  for (const child of p.parts ?? []) walk(child, out);
}

function decodeB64Url(data: string): string {
  const buf = Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  return buf.toString("utf8");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|li|h\d|br)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildQuery(opts: {
  companies: string[];
  daysBack?: number;
}): string {
  const days = opts.daysBack ?? 60;
  const companyClauses = opts.companies
    .map((c) => c.replace(/[()"\\]/g, "").trim())
    .filter(Boolean)
    .map((c) => `"${c}"`)
    .slice(0, 30);
  // Search the last N days, in any of subject/from/body for company names.
  // Skip categories: Promotions/Social/Forums by default.
  const base = `newer_than:${days}d -category:promotions -category:social -category:forums`;
  if (companyClauses.length === 0) {
    // Fallback: generic job-search keywords.
    return `${base} (interview OR "thanks for applying" OR "next steps" OR recruiter OR "your application")`;
  }
  return `${base} (${companyClauses.join(" OR ")})`;
}
