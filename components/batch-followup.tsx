"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  Copy,
  Loader2,
  Mail,
  Clock,
  CheckSquare,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { store, type StoredJob } from "@/lib/storage";
import { useLang } from "@/components/lang-provider";

type GeneratedEmail = {
  jobId: string;
  subject: string;
  body: string;
  copied: boolean;
};

function daysSince(job: StoredJob): number {
  const ref = job.appliedAt ?? job.createdAt;
  return Math.floor((Date.now() - new Date(ref).getTime()) / 86_400_000);
}

export function BatchFollowUp() {
  const { t, lang } = useLang();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [emails, setEmails] = useState<GeneratedEmail[]>([]);

  const staleJobs = store
    .getJobs()
    .filter((j) => {
      if (!["applied", "screen"].includes(j.status)) return false;
      return daysSince(j) >= 7;
    })
    .sort((a, b) => daysSince(b) - daysSince(a));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(staleJobs.map((j) => j.id)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  const markCopied = useCallback((id: string) => {
    setEmails((prev) =>
      prev.map((e) => (e.jobId === id ? { ...e, copied: true } : e)),
    );
  }, []);

  async function generate() {
    const resume = store.getResume();
    if (!resume) {
      toast.error(t("launch.noResume"));
      return;
    }
    setGenerating(true);
    setEmails([]);

    const targets = staleJobs.filter((j) => selected.has(j.id));

    const results = await Promise.all(
      targets.map(async (job) => {
        try {
          const res = await fetch("/api/followup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              resume: resume.parsed,
              job: job.parsed,
              language: lang,
              daysAgo: daysSince(job),
            }),
          });
          if (!res.ok) throw new Error("failed");
          const { subject, body } = await res.json();
          return { jobId: job.id, subject, body, copied: false };
        } catch {
          return null;
        }
      }),
    );

    setEmails(results.filter(Boolean) as GeneratedEmail[]);
    setGenerating(false);
  }

  if (staleJobs.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-center">
        <CheckCircle2 className="size-10 text-green-400/60" />
        <p className="text-muted-foreground text-sm">{t("followBatch.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground flex-1">
          {t("followBatch.subtitle")}
        </p>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={selectAll}>
          <CheckSquare className="size-3 me-1" />
          {t("launch.selectAll")}
        </Button>
        {selected.size > 0 && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearAll}>
            <Square className="size-3 me-1" />
            {t("launch.clearAll")}
          </Button>
        )}
      </div>

      {/* Stale job list */}
      <div className="space-y-2">
        {staleJobs.map((j) => (
          <div
            key={j.id}
            onClick={() => toggle(j.id)}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${
              selected.has(j.id)
                ? "border-primary/50 bg-primary/5"
                : "border-border/40 bg-card/60 hover:border-primary/30"
            }`}
          >
            <Checkbox
              checked={selected.has(j.id)}
              onCheckedChange={() => toggle(j.id)}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{j.parsed.title}</p>
              <p className="text-xs text-muted-foreground truncate">{j.parsed.company}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-amber-400 shrink-0">
              <Clock className="size-3" />
              {daysSince(j)} {t("followBatch.days")}
            </div>
          </div>
        ))}
      </div>

      {/* Generate button */}
      {selected.size > 0 && emails.length === 0 && (
        <Button
          onClick={generate}
          disabled={generating}
          className="w-full bg-gradient-to-r from-primary to-fuchsia-500 hover:opacity-90 transition-opacity"
        >
          {generating ? (
            <Loader2 className="size-4 me-2 animate-spin" />
          ) : (
            <Mail className="size-4 me-2" />
          )}
          {generating
            ? t("followBatch.generating")
            : t("followBatch.generate").replace("{n}", String(selected.size))}
        </Button>
      )}

      {/* Generated emails */}
      {emails.length > 0 && (
        <div className="space-y-3">
          {emails.map((e) => {
            const job = staleJobs.find((j) => j.id === e.jobId);
            return (
              <Card key={e.jobId} className="glass">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold truncate">
                      {job?.parsed.title} · {job?.parsed.company}
                    </p>
                    <CopyBtn
                      text={`${t("followBatch.subject")}: ${e.subject}\n\n${e.body}`}
                      copied={e.copied}
                      onCopy={() => markCopied(e.jobId)}
                      t={t}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      {t("followBatch.subject")}
                    </p>
                    <p className="text-xs bg-muted/30 rounded px-2 py-1">{e.subject}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      {t("followBatch.body")}
                    </p>
                    <ScrollArea className="h-28">
                      <p className="text-xs whitespace-pre-wrap px-2 py-1 bg-muted/20 rounded leading-relaxed">
                        {e.body}
                      </p>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              setEmails([]);
              setSelected(new Set());
            }}
          >
            {t("batch.close")}
          </Button>
        </div>
      )}
    </div>
  );
}

function CopyBtn({
  text,
  copied,
  onCopy,
  t,
}: {
  text: string;
  copied: boolean;
  onCopy: () => void;
  t: (k: import("@/lib/i18n/dictionary").Key) => string;
}) {
  function doCopy() {
    navigator.clipboard.writeText(text);
    onCopy();
    // no toast — visual feedback in button is enough
  }
  return (
    <button
      onClick={doCopy}
      className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full transition-colors ${
        copied
          ? "bg-green-500/15 text-green-400"
          : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
      }`}
    >
      {copied ? <CheckCircle2 className="size-3" /> : <Copy className="size-3" />}
      {copied ? t("followBatch.copied") : t("followBatch.copy")}
    </button>
  );
}
