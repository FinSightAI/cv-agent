"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Zap, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { store, type StoredJob } from "@/lib/storage";
import { aiFetchJson } from "@/lib/utils";
import type { TailoredResume } from "@/lib/ai/schemas";
import { resumeToMarkdown } from "@/lib/cv-export";
import { useLang } from "@/components/lang-provider";

type Step = "tailor" | "letter" | "zip" | "apply";
type StepState = "pending" | "running" | "done" | "skip";

function getInitialSteps(job: StoredJob, hasResume: boolean): Record<Step, StepState> {
  return {
    tailor: !hasResume || job.tailoredResume ? "skip" : "pending",
    letter: job.coverLetter ? "skip" : "pending",
    zip: "pending",
    apply: job.url ? "pending" : "skip",
  };
}

export function TurboApply({ job: initialJob }: { job: StoredJob }) {
  const { lang, t } = useLang();
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Record<Step, StepState> | null>(null);
  const [currentJob, setCurrentJob] = useState(initialJob);

  function setStep(step: Step, state: StepState) {
    setSteps((prev) => (prev ? { ...prev, [step]: state } : null));
  }

  async function turboApply() {
    const resume = store.getResume();
    const initialSteps = getInitialSteps(currentJob, !!resume);
    setSteps(initialSteps);
    setRunning(true);

    let job = store.getJob(currentJob.id) ?? currentJob;

    try {
      // Step 1: Tailor CV
      if (initialSteps.tailor === "pending" && resume) {
        setStep("tailor", "running");
        try {
          const data = await aiFetchJson<{ result: TailoredResume }>(
            "/api/cv/tailor",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ resume: resume.parsed, job: job.parsed }),
            },
            { t, fallback: "Tailor failed" },
          );
          job = { ...job, tailoredResume: data.result };
          store.saveJob(job);
          setCurrentJob(job);
          setStep("tailor", "done");
        } catch {
          setStep("tailor", "skip");
        }
      }

      // Step 2: Cover letter
      if (initialSteps.letter === "pending" && resume) {
        setStep("letter", "running");
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
            job = { ...job, coverLetter: acc };
            store.saveJob(job);
            setCurrentJob(job);
          }
          setStep("letter", "done");
        } catch {
          setStep("letter", "skip");
        }
      }

      // Step 3: Download ZIP
      setStep("zip", "running");
      await new Promise<void>((resolve) => {
        import("jszip").then(({ default: JSZip }) => {
          const zip = new JSZip();
          const filename = `${job.parsed.company}-${job.parsed.title}`
            .replace(/[^\p{L}\p{N}\-_. ]/gu, "")
            .replace(/\s+/g, "-")
            .slice(0, 60);
          const jobInfo = [
            `תפקיד: ${job.parsed.title}`,
            `חברה: ${job.parsed.company}`,
            job.url ? `URL: ${job.url}` : "",
            `תאריך הכנה: ${new Date().toLocaleDateString("he-IL")}`,
          ].filter(Boolean).join("\n");
          zip.file("job-info.txt", jobInfo);
          if (job.coverLetter) zip.file("cover-letter.txt", job.coverLetter);
          if (job.tailoredResume) {
            zip.file("tailored-cv.md", resumeToMarkdown(job.tailoredResume.resume, lang));
          }
          zip.generateAsync({ type: "blob" }).then((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${filename}.zip`;
            a.click();
            URL.revokeObjectURL(url);
            resolve();
          });
        });
      });
      setStep("zip", "done");

      // Step 4: Open apply URL
      if (job.url) {
        setStep("apply", "running");
        window.open(job.url, "_blank", "noopener,noreferrer");
        setStep("apply", "done");
      }

      toast.success("🚀 הכל מוכן — הגש עכשיו!");
    } catch {
      toast.error("משהו נכשל — נסה שוב");
    } finally {
      setRunning(false);
    }
  }

  const STEP_LABELS: Record<Step, string> = {
    tailor: "מתאים CV",
    letter: "כותב מכתב",
    zip: "מוריד חבילה",
    apply: "פותח דף הגשה",
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={turboApply}
        disabled={running}
        className="bg-gradient-to-r from-primary to-fuchsia-500 hover:opacity-90 transition-opacity text-primary-foreground"
        size="sm"
      >
        {running ? (
          <Loader2 className="size-4 me-1.5 animate-spin" />
        ) : (
          <Zap className="size-4 me-1.5" />
        )}
        {running ? "מכין..." : "🚀 Turbo Apply"}
      </Button>

      {steps && (
        <div className="flex flex-wrap gap-2">
          {(Object.entries(steps) as [Step, StepState][])
            .filter(([, s]) => s !== "skip")
            .map(([step, state]) => (
              <span
                key={step}
                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${
                  state === "done"
                    ? "bg-green-500/15 text-green-400"
                    : state === "running"
                    ? "bg-primary/15 text-primary"
                    : "bg-muted/40 text-muted-foreground"
                }`}
              >
                {state === "done" ? (
                  <CheckCircle2 className="size-3" />
                ) : state === "running" ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <span className="size-3 rounded-full border border-current opacity-40" />
                )}
                {STEP_LABELS[step]}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
