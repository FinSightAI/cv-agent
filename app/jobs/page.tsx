"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Briefcase, Search, X, Sparkles, Clock, Loader2, Download } from "lucide-react";
import { store, type StoredJob } from "@/lib/storage";
import { useLang } from "@/components/lang-provider";
import type { Key } from "@/lib/i18n/dictionary";
import { formatDate } from "@/lib/utils";
import { resumeToDocxBlob } from "@/lib/cv-export-docx";
import type { TailoredResume } from "@/lib/ai/schemas";
import { toast } from "sonner";

type StatusFilter = "all" | StoredJob["status"];
type ScoreFilter = "all" | "60" | "75" | "85";

const STATUS_DOT: Record<StoredJob["status"], string> = {
  saved: "bg-muted-foreground/40",
  drafting: "bg-blue-400",
  ready: "bg-cyan-400",
  applied: "bg-violet-400",
  screen: "bg-amber-400",
  interview: "bg-green-400",
  offer: "bg-emerald-400",
  rejected: "bg-red-400",
  withdrawn: "bg-muted-foreground/40",
  ghosted: "bg-muted-foreground/40",
};

const STATUS_BORDER: Record<StoredJob["status"], string> = {
  saved: "border-s-muted-foreground/20",
  drafting: "border-s-blue-500/40",
  ready: "border-s-cyan-500/40",
  applied: "border-s-violet-500/40",
  screen: "border-s-amber-500/40",
  interview: "border-s-green-500/50",
  offer: "border-s-emerald-500/60",
  rejected: "border-s-red-500/30",
  withdrawn: "border-s-muted-foreground/20",
  ghosted: "border-s-muted-foreground/20",
};

function isStale(j: StoredJob) {
  if (!["applied", "screen"].includes(j.status)) return false;
  const ref = j.appliedAt ?? j.createdAt;
  return (Date.now() - new Date(ref).getTime()) / 86_400_000 > 7;
}

export default function JobsPage() {
  const { t, lang } = useLang();
  const [jobs, setJobs] = useState<StoredJob[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [minScore, setMinScore] = useState<ScoreFilter>("all");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setJobs(store.getJobs());
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = minScore === "all" ? 0 : Number(minScore);
    return jobs.filter((j) => {
      if (status !== "all" && j.status !== status) return false;
      if (min > 0 && (j.match?.score ?? 0) < min) return false;
      if (remoteOnly && !j.parsed.remote) return false;
      if (q) {
        const hay =
          `${j.parsed.title} ${j.parsed.company} ${j.parsed.location ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, query, status, minScore, remoteOnly]);

  const hasFilters =
    query !== "" || status !== "all" || minScore !== "all" || remoteOnly;

  function clearFilters() {
    setQuery("");
    setStatus("all");
    setMinScore("all");
    setRemoteOnly(false);
  }

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedIds(new Set(filtered.map((j) => j.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-6 lg:p-10 space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t("jobs.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {jobs.length === 0
              ? t("jobs.empty")
              : hasFilters
              ? `${filtered.length} / ${jobs.length} ${t("jobs.count")}`
              : `${jobs.length} ${t("jobs.count")}`}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/jobs/new">
            <Plus className="size-4 me-1" />
            {t("jobs.add")}
          </Link>
        </Button>
      </header>

      {/* Filters */}
      {jobs.length > 0 && (
        <div className="flex flex-wrap gap-2 items-end">
          <div className="relative min-w-[180px] flex-1">
            <Search className="size-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("jobs.filter.search.placeholder")}
              className="ps-8 h-8 text-sm"
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("jobs.filter.all")}</SelectItem>
              {(
                [
                  "saved", "drafting", "ready", "applied", "screen",
                  "interview", "offer", "rejected", "withdrawn", "ghosted",
                ] as StoredJob["status"][]
              ).map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`status.${s}` as Key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={minScore} onValueChange={(v) => setMinScore(v as ScoreFilter)}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("jobs.filter.all")}</SelectItem>
              <SelectItem value="60">60+</SelectItem>
              <SelectItem value="75">75+</SelectItem>
              <SelectItem value="85">85+</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={remoteOnly ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setRemoteOnly((v) => !v)}
          >
            {t("jobs.filter.remoteOnly")}
          </Button>
          {hasFilters && (
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
              <X className="size-3 me-1" />
              {t("jobs.filter.clear")}
            </Button>
          )}
        </div>
      )}

      {/* Batch selection bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-sm font-medium">
            {selectedIds.size} {t("jobs.batch.selected")}
          </span>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAllVisible}>
            {t("jobs.batch.selectAll")}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearSelection}>
            {t("jobs.batch.clearSelection")}
          </Button>
          <div className="flex-1" />
          <BatchTailorButton
            jobIds={Array.from(selectedIds)}
            jobs={jobs}
            lang={lang}
            t={t}
            onDone={clearSelection}
          />
        </div>
      )}

      {/* Empty states */}
      {jobs.length === 0 && (
        <Card className="glass border-dashed">
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <div className="size-16 rounded-2xl bg-primary/10 grid place-items-center">
              <Briefcase className="size-8 text-primary" />
            </div>
            <p className="text-muted-foreground">{t("jobs.emptyState")}</p>
            <Button asChild>
              <Link href="/jobs/new">
                <Plus className="size-4 me-2" />
                {t("jobs.add")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {jobs.length > 0 && filtered.length === 0 && (
        <Card className="glass border-dashed">
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <p className="text-muted-foreground">{t("jobs.filter.empty")}</p>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="size-4 me-1" />
              {t("jobs.filter.clear")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Job grid */}
      {filtered.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((j) => (
            <JobCard
              key={j.id}
              job={j}
              lang={lang}
              t={t}
              selected={selectedIds.has(j.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function sanitizeFilename(company: string, title: string): string {
  return `${company}-${title}`
    .replace(/[^\p{L}\p{N}\-_. ]/gu, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function dedupeFilename(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let i = 2;
  while (used.has(`${base}-${i}`)) i++;
  const name = `${base}-${i}`;
  used.add(name);
  return name;
}

type BatchStatus = "pending" | "retrying" | "done" | "failed";
type BatchRow = { jobId: string; title: string; company: string; status: BatchStatus; error?: string };

function BatchTailorButton({
  jobIds,
  jobs,
  lang,
  t,
  onDone,
}: {
  jobIds: string[];
  jobs: StoredJob[];
  lang: string;
  t: (k: Key) => string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<BatchRow[]>([]);

  async function tailorOne(
    job: StoredJob,
    resumeParsed: unknown,
    used: Set<string>,
    files: { filename: string; blob: Blob; company: string; title: string }[],
    attempt = 1,
  ): Promise<void> {
    const res = await fetch("/api/cv/tailor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume: resumeParsed, job: job.parsed }),
    });

    if (res.status === 429) {
      const { retryAfter } = await res.json().catch(() => ({ retryAfter: 15 }));
      if (attempt >= 3) throw new Error(t("error.rateLimit"));
      setRows((prev) =>
        prev.map((r) =>
          r.jobId === job.id ? { ...r, status: "retrying", error: `retry in ${retryAfter}s` } : r,
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, (retryAfter + 1) * 1000));
      return tailorOne(job, resumeParsed, used, files, attempt + 1);
    }

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Tailor failed" }));
      throw new Error(error || "Tailor failed");
    }

    const { result } = (await res.json()) as { result: TailoredResume };
    const updated: StoredJob = { ...job, tailoredResume: result };
    store.saveJob(updated);

    const blob = await resumeToDocxBlob(result.resume, lang as "he" | "en");
    const base = sanitizeFilename(job.parsed.company, job.parsed.title);
    const filename = dedupeFilename(base, used);
    files.push({
      filename: `${filename}.docx`,
      blob,
      company: job.parsed.company,
      title: job.parsed.title,
    });

    setRows((prev) => prev.map((r) => (r.jobId === job.id ? { ...r, status: "done" } : r)));
  }

  async function run() {
    const resume = store.getResume();
    if (!resume?.parsed) {
      toast.error(t("tailor.noResume"));
      return;
    }
    const selected = jobs.filter((j) => jobIds.includes(j.id));
    setBusy(true);
    setRows(
      selected.map((j) => ({
        jobId: j.id,
        title: j.parsed.title,
        company: j.parsed.company,
        status: "pending",
      })),
    );

    const used = new Set<string>();
    const files: { filename: string; blob: Blob; company: string; title: string }[] = [];

    // Strictly sequential: /api/cv/tailor allows 4 req/min per IP (HEAVY_AI_LIMIT,
    // its own scope bucket — see lib/rate-limit.ts). Firing this concurrently
    // just turns into a wall of 429s, same lesson already learned for bulk job add.
    for (const job of selected) {
      try {
        await tailorOne(job, resume.parsed, used, files);
      } catch (err) {
        setRows((prev) =>
          prev.map((r) =>
            r.jobId === job.id ? { ...r, status: "failed", error: (err as Error).message } : r,
          ),
        );
      }
    }

    if (files.length === 0) {
      toast.error(t("jobs.batch.zipFailed"));
      setBusy(false);
      return;
    }

    const manifest = files.map((f) => `${f.company} | ${f.title} | ${f.filename}`).join("\n");

    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    zip.file("manifest.txt", manifest);
    for (const f of files) zip.file(f.filename, f.blob);
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tailored-cvs.zip";
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`${files.length}/${selected.length} ${t("jobs.batch.summary")}`);
    setBusy(false);
    onDone();
  }

  return (
    <div className="flex items-center gap-2">
      {rows.length > 0 && busy && (
        <span className="text-xs text-muted-foreground">
          {rows.filter((r) => r.status === "done").length}/{rows.length}
        </span>
      )}
      <Button type="button" size="sm" onClick={run} disabled={busy}>
        {busy ? (
          <Loader2 className="size-4 me-1 animate-spin" />
        ) : (
          <Download className="size-4 me-1" />
        )}
        {busy ? t("jobs.batch.running") : t("jobs.batch.run")}
      </Button>
    </div>
  );
}

function JobCard({
  job: j,
  lang,
  t,
  selected,
  onToggleSelect,
}: {
  job: StoredJob;
  lang: string;
  t: (k: Key) => string;
  selected: boolean;
  onToggleSelect: (id: string, e: React.MouseEvent) => void;
}) {
  const stale = isStale(j);
  return (
    <Link href={`/jobs/${j.id}`}>
      <Card
        className={`glass hover:border-primary/40 transition-all h-full border-s-2 relative ${STATUS_BORDER[j.status]}`}
      >
        <CardContent className="p-4 space-y-3">
          {/* Selection checkbox — stopPropagation so it never triggers the card's Link navigation */}
          <div
            className="absolute start-2 top-2 z-10"
            onClick={(e) => onToggleSelect(j.id, e)}
          >
            <Checkbox checked={selected} onCheckedChange={() => {}} />
          </div>
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 ps-6">
            <div className="min-w-0 space-y-0.5">
              <p className="font-semibold text-sm truncate leading-tight">{j.parsed.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {j.parsed.company}
                {j.parsed.location ? ` · ${j.parsed.location}` : ""}
                {j.parsed.remote ? " · Remote" : ""}
              </p>
            </div>
            {j.match && (
              <div className="shrink-0 text-right">
                <span
                  className={`text-base font-bold tabular-nums ${
                    j.match.score >= 80
                      ? "text-green-400"
                      : j.match.score >= 65
                      ? "text-amber-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {j.match.score}
                </span>
              </div>
            )}
          </div>

          {/* Score bar */}
          {j.match && (
            <Progress
              value={j.match.score}
              className="h-0.5 opacity-50"
            />
          )}

          {/* Footer row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className={`size-1.5 rounded-full shrink-0 ${STATUS_DOT[j.status]}`} />
              <span className="text-[11px] text-muted-foreground">
                {t(`status.${j.status}` as Key)}
              </span>
              {stale && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 flex items-center gap-1">
                  <Clock className="size-2.5" />
                  7+d
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {!j.match && (
                <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                  <Sparkles className="size-2.5" />
                  {t("job.match.run")}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/60">
                {formatDate(j.createdAt, lang as "he" | "en")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function statusKey(s: StoredJob["status"]): Key {
  return `status.${s}` as Key;
}
