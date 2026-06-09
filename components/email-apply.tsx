"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";
import { store, type StoredJob } from "@/lib/storage";
import { resumeToMarkdown } from "@/lib/cv-export";
import { useLang } from "@/components/lang-provider";

function extractEmail(text: string): string | null {
  const m = text.match(/[\w.+\-]+@[\w\-]+\.[\w.]+/);
  return m ? m[0] : null;
}

export function EmailApply({ job }: { job: StoredJob }) {
  const { t, lang } = useLang();
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  const applyEmail = extractEmail(job.rawText);
  if (!applyEmail) return null;

  async function send() {
    setState("sending");
    const resume = store.getResume();
    try {
      const body = {
        to: applyEmail,
        jobTitle: job.parsed.title,
        company: job.parsed.company,
        applicantName: resume?.parsed.fullName,
        coverLetter: job.coverLetter,
        tailoredCvMd: job.tailoredResume
          ? resumeToMarkdown(job.tailoredResume.resume, lang)
          : undefined,
        lang,
      };
      const res = await fetch("/api/apply/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "" }));
        if (error?.includes("RESEND_API_KEY")) {
          toast.error(t("emailApply.noKey"));
        } else {
          toast.error(t("emailApply.failed"));
        }
        setState("error");
        return;
      }
      // Mark as applied
      const updated = {
        ...job,
        status: "applied" as const,
        appliedAt: job.appliedAt ?? new Date().toISOString(),
      };
      store.saveJob(updated);
      setState("done");
      toast.success(t("emailApply.sent"));
    } catch {
      toast.error(t("emailApply.failed"));
      setState("error");
    }
  }

  function copyEmail() {
    navigator.clipboard.writeText(applyEmail!);
    toast.success(t("emailApply.copied"));
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        size="sm"
        variant="outline"
        onClick={send}
        disabled={state === "sending" || state === "done"}
        className={
          state === "done"
            ? "border-green-500/40 text-green-400"
            : "border-primary/40 hover:border-primary/70"
        }
      >
        {state === "sending" ? (
          <Loader2 className="size-4 me-1.5 animate-spin" />
        ) : state === "done" ? (
          <CheckCircle2 className="size-4 me-1.5" />
        ) : (
          <Mail className="size-4 me-1.5" />
        )}
        {state === "sending"
          ? t("emailApply.sending")
          : state === "done"
          ? t("emailApply.sent")
          : t("emailApply.button")}
      </Button>
      <button
        onClick={copyEmail}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <Copy className="size-3" />
        {applyEmail}
      </button>
    </div>
  );
}
