"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Loader2,
  XCircle,
  ExternalLink,
  Download,
  Rocket,
} from "lucide-react";
import { store, type StoredJob } from "@/lib/storage";
import { aiFetchJson } from "@/lib/utils";
import type { TailoredResume } from "@/lib/ai/schemas";
import { resumeToMarkdown, coverLetterToHtml } from "@/lib/cv-export";
import { useLang } from "@/components/lang-provider";

type JobStepState = "pending" | "running" | "done" | "skip" | "failed";

type JobProgress = {
  job: StoredJob;
  tailor: JobStepState;
  letter: JobStepState;
  overall: "pending" | "running" | "done" | "failed";
};

type BatchState = "idle" | "running" | "bundling" | "done";

const CONCURRENCY = 3;

async function processJob(
  jobId: string,
  lang: string,
  onProgress: (update: Partial<JobProgress>) => void,
): Promise<{ job: StoredJob; coverLetter: string; tailoredMd: string }> {
  const resume = store.getResume();
  let job = store.getJob(jobId);
  if (!job) throw new Error("job not found");

  onProgress({ overall: "running" });

  // Step 1: Tailor CV (skip if already done)
  if (resume && !job.tailoredResume) {
    onProgress({ tailor: "running" });
    try {
      const data = await aiFetchJson<{ result: TailoredResume }>(
        "/api/cv/tailor",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume: resume.parsed, job: job.parsed }),
        },
        { t: (k) => k, fallback: "Tailor failed" },
      );
      job = { ...job, tailoredResume: data.result };
      store.saveJob(job);
      onProgress({ tailor: "done" });
    } catch {
      onProgress({ tailor: "skip" });
    }
  } else {
    onProgress({ tailor: "skip" });
  }

  // Step 2: Cover letter (skip if already done)
  let coverLetter = job.coverLetter ?? "";
  if (resume && !job.coverLetter) {
    onProgress({ letter: "running" });
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: resume.parsed,
          job: job.parsed,
          tone: "professional",
          language: lang,
        }),
      });
      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value);
        }
        coverLetter = acc;
        job = { ...job, coverLetter };
        store.saveJob(job);
      }
      onProgress({ letter: "done" });
    } catch {
      onProgress({ letter: "skip" });
    }
  } else {
    onProgress({ letter: "skip" });
  }

  const tailoredMd = job.tailoredResume
    ? resumeToMarkdown(job.tailoredResume.resume, lang as "he" | "en")
    : "";

  onProgress({ overall: "done" });
  return { job, coverLetter, tailoredMd };
}

export function BatchTurboApply({
  jobs,
  open,
  onClose,
}: {
  jobs: StoredJob[];
  open: boolean;
  onClose: () => void;
}) {
  const { t, lang } = useLang();
  const [state, setState] = useState<BatchState>("idle");
  const [progress, setProgress] = useState<JobProgress[]>([]);
  const [bundleUrl, setBundleUrl] = useState<string | null>(null);
  const [urlsToOpen, setUrlsToOpen] = useState<string[]>([]);

  // Reset to idle when dialog opens — only if no batch is running
  useEffect(() => {
    if (open) {
      setState((prev) => {
        if (prev === "running" || prev === "bundling") return prev;
        setProgress([]);
        setBundleUrl(null);
        setUrlsToOpen([]);
        return "idle";
      });
    }
  }, [open]);

  const updateJob = useCallback((id: string, update: Partial<JobProgress>) => {
    setProgress((prev) =>
      prev.map((p) => (p.job.id === id ? { ...p, ...update } : p)),
    );
  }, []);

  async function run() {
    const resume = store.getResume();
    if (!resume) return;

    setState("running");
    setProgress(
      jobs.map((j) => ({
        job: j,
        tailor: "pending",
        letter: "pending",
        overall: "pending",
      })),
    );
    setBundleUrl(null);

    // Run with concurrency limit
    const results: Array<{
      job: StoredJob;
      coverLetter: string;
      tailoredMd: string;
    }> = [];
    const queue = [...jobs];
    const inFlight: Promise<void>[] = [];

    async function runOne(job: StoredJob) {
      try {
        const result = await processJob(
          job.id,
          lang,
          (update) => updateJob(job.id, update),
        );
        results.push(result);
      } catch {
        updateJob(job.id, { overall: "failed" });
      }
    }

    while (queue.length > 0 || inFlight.length > 0) {
      while (inFlight.length < CONCURRENCY && queue.length > 0) {
        const job = queue.shift()!;
        const p = runOne(job).finally(() => {
          const idx = inFlight.indexOf(p);
          if (idx >= 0) inFlight.splice(idx, 1);
        });
        inFlight.push(p);
      }
      if (inFlight.length > 0) await Promise.race(inFlight);
    }

    // Bundle all into ZIP
    setState("bundling");
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();

      for (const { job, coverLetter, tailoredMd } of results) {
        const folder = `${job.parsed.company} - ${job.parsed.title}`
          .replace(/[^\p{L}\p{N}\-_. ]/gu, "")
          .replace(/\s+/g, " ")
          .slice(0, 50);
        const dir = zip.folder(folder)!;

        const info = [
          `תפקיד: ${job.parsed.title}`,
          `חברה: ${job.parsed.company}`,
          job.url ? `URL: ${job.url}` : "",
          `תאריך הכנה: ${new Date().toLocaleDateString("he-IL")}`,
        ]
          .filter(Boolean)
          .join("\n");

        dir.file("job-info.txt", info);
        if (coverLetter) {
          dir.file(
            "cover-letter.html",
            coverLetterToHtml(coverLetter, lang as "he" | "en", job.parsed.title, job.parsed.company),
          );
        }
        if (tailoredMd) dir.file("tailored-cv.md", tailoredMd);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      setBundleUrl(url);
      setUrlsToOpen(results.map((r) => r.job.url ?? "").filter(Boolean));
    } catch {
      // ZIP failed — still mark done
    }

    setState("done");
  }

  function downloadBundle() {
    if (!bundleUrl) return;
    const a = document.createElement("a");
    a.href = bundleUrl;
    a.download = `jobos-batch-${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
  }

  function openAllUrls() {
    urlsToOpen.forEach((url, i) => {
      setTimeout(() => window.open(url, "_blank", "noopener,noreferrer"), i * 400);
    });
  }

  function markAllApplied() {
    for (const { job } of progress.filter((p) => p.overall === "done")) {
      const stored = store.getJob(job.id);
      if (!stored || stored.status === "applied") continue;
      store.saveJob({
        ...stored,
        status: "applied",
        appliedAt: new Date().toISOString(),
      });
    }
  }

  const doneCount = progress.filter((p) => p.overall === "done").length;
  const totalCount = progress.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="size-5 text-primary" />
            {t("batch.title")}
          </DialogTitle>
        </DialogHeader>

        {state === "idle" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("batch.preparing").replace("{n}", String(jobs.length))}
            </p>
            <Button
              className="w-full bg-gradient-to-r from-primary to-fuchsia-500 hover:opacity-90 transition-opacity"
              onClick={run}
            >
              <Rocket className="size-4 me-2" />
              {t("launch.launch").replace("{n}", String(jobs.length))}
            </Button>
          </div>
        )}

        {(state === "running" || state === "bundling" || state === "done") && (
          <div className="space-y-4">
            {(
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {t("batch.progress")
                      .replace("{done}", String(doneCount))
                      .replace("{total}", String(totalCount))}
                  </span>
                  <span>{pct}%</span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </div>
            )}

            <ScrollArea className="h-[280px] rounded-lg border border-border/40">
              <div className="p-2 space-y-1.5">
                {progress.map((p) => (
                  <div
                    key={p.job.id}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 bg-muted/30"
                  >
                    <div className="shrink-0">
                      {p.overall === "done" ? (
                        <CheckCircle2 className="size-4 text-green-400" />
                      ) : p.overall === "failed" ? (
                        <XCircle className="size-4 text-red-400" />
                      ) : p.overall === "running" ? (
                        <Loader2 className="size-4 animate-spin text-primary" />
                      ) : (
                        <div className="size-4 rounded-full border border-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {p.job.parsed.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {p.job.parsed.company}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <StepBadge state={p.tailor} label={t("batch.step.tailor")} />
                      <StepBadge state={p.letter} label={t("batch.step.letter")} />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {state === "bundling" && (
              <p className="text-xs text-muted-foreground text-center animate-pulse">
                {t("batch.downloading")}
              </p>
            )}

            {state === "done" && (
              <div className="flex flex-wrap gap-2">
                {bundleUrl && (
                  <Button size="sm" onClick={downloadBundle} className="flex-1">
                    <Download className="size-3.5 me-1.5" />
                    {t("batch.download")}
                  </Button>
                )}
                {urlsToOpen.length > 0 && (
                  <Button size="sm" variant="outline" onClick={openAllUrls} className="flex-1">
                    <ExternalLink className="size-3.5 me-1.5" />
                    {t("batch.openAll")} ({urlsToOpen.length})
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    markAllApplied();
                    onClose();
                  }}
                >
                  <CheckCircle2 className="size-3.5 me-1.5" />
                  {t("batch.markApplied")}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StepBadge({
  state,
  label,
}: {
  state: JobStepState;
  label: string;
}) {
  if (state === "skip") return null;
  return (
    <Badge
      variant="outline"
      className={`text-[9px] px-1.5 py-0 h-4 ${
        state === "done"
          ? "border-green-500/40 text-green-400"
          : state === "running"
          ? "border-primary/40 text-primary"
          : state === "failed"
          ? "border-red-500/40 text-red-400"
          : "border-border/30 text-muted-foreground/50"
      }`}
    >
      {state === "running" ? (
        <Loader2 className="size-2 animate-spin" />
      ) : (
        label
      )}
    </Badge>
  );
}
