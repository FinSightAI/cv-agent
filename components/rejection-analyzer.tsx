"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Copy,
  Loader2,
  Sparkles,
  DoorOpen,
  DoorClosed,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Info,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { store, type StoredJob } from "@/lib/storage";
import { useLang } from "@/components/lang-provider";

type RejectionResult = {
  type: "form_letter" | "personalized" | "ambiguous";
  doorOpen: boolean;
  warmthLevel: "cold" | "neutral" | "warm";
  shouldReply: boolean;
  replyDraft?: string;
  insights: string[];
  timeToFollowUp?: string;
  oneLineSummary: string;
};

export function RejectionAnalyzer({ job }: { job: StoredJob }) {
  const { t } = useLang();
  const [emailText, setEmailText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RejectionResult | null>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);

  const isGhosted = job.status === "ghosted";

  async function analyze() {
    setLoading(true);
    try {
      const resume = store.getResume();
      const res = await fetch("/api/rejection-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailText: emailText.trim() || undefined,
          resume: resume?.parsed,
          job: job.parsed,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 429) {
          toast.error(t("error.rateLimit"));
        } else {
          toast.error(err.error ?? "שגיאה בניתוח המייל");
        }
        return;
      }
      const data = await res.json();
      setResult(data.result);
    } catch {
      toast.error("שגיאה בניתוח המייל");
    } finally {
      setLoading(false);
    }
  }

  function copyDraft() {
    if (!result?.replyDraft) return;
    navigator.clipboard.writeText(result.replyDraft);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
    toast.success(t("common.copied"));
  }

  const warmthCardClass =
    result?.warmthLevel === "warm"
      ? "border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/5"
      : result?.warmthLevel === "neutral"
        ? "border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-yellow-500/5"
        : "border-red-500/30 bg-gradient-to-br from-red-500/5 to-rose-500/5";

  const warmthTextClass =
    result?.warmthLevel === "warm"
      ? "text-green-400"
      : result?.warmthLevel === "neutral"
        ? "text-amber-400"
        : "text-red-400";

  const typeLabel =
    result?.type === "form_letter"
      ? t("rejection.type.form_letter")
      : result?.type === "personalized"
        ? t("rejection.type.personalized")
        : t("rejection.type.ambiguous");

  const typeBadgeClass =
    result?.type === "personalized"
      ? "border-blue-500/30 text-blue-300"
      : result?.type === "form_letter"
        ? "border-zinc-500/30 text-zinc-400"
        : "border-amber-500/30 text-amber-300";

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card className="glass border-border/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="size-4 text-muted-foreground" />
            {t("rejection.title")}
          </CardTitle>
          <CardDescription>{t("rejection.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isGhosted && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-300">
              הוגדר כ-ghosted — לא קיבלת מייל? גם זה מידע.
            </div>
          )}

          <Textarea
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            placeholder={t("rejection.paste")}
            rows={6}
            className="bg-background/50 text-sm"
          />

          <Button
            onClick={analyze}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 me-2 animate-spin" />
                {t("rejection.analyzing")}
              </>
            ) : (
              <>
                <Sparkles className="size-4 me-2" />
                {t("rejection.analyze")}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* One-line summary */}
          <div className={`glass rounded-xl p-5 border ${warmthCardClass}`}>
            <p className={`text-lg font-semibold ${warmthTextClass}`}>
              {result.oneLineSummary}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="outline" className={typeBadgeClass}>
                {typeLabel}
              </Badge>
              {result.doorOpen ? (
                <Badge
                  variant="outline"
                  className="border-green-500/30 text-green-300 gap-1"
                >
                  <DoorOpen className="size-3" />
                  {t("rejection.doorOpen")}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-red-500/30 text-red-400 gap-1"
                >
                  <DoorClosed className="size-3" />
                  {t("rejection.doorClosed")}
                </Badge>
              )}
            </div>
          </div>

          {/* Should reply */}
          <div
            className={`glass rounded-xl p-4 border flex items-start gap-3 ${
              result.shouldReply
                ? "border-blue-500/20 bg-blue-500/5"
                : "border-zinc-500/20"
            }`}
          >
            {result.shouldReply ? (
              <CheckCircle2 className="size-5 text-blue-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="size-5 text-zinc-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div
                className={`font-medium text-sm ${result.shouldReply ? "text-blue-300" : "text-zinc-400"}`}
              >
                {result.shouldReply
                  ? t("rejection.shouldReply")
                  : t("rejection.shouldNotReply")}
              </div>
              {result.timeToFollowUp && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="size-3" />
                  {result.timeToFollowUp}
                </p>
              )}
            </div>
          </div>

          {/* Reply draft */}
          {result.shouldReply && result.replyDraft && (
            <div className="glass rounded-xl p-4 border border-blue-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-300">
                  {t("rejection.replyDraft")}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyDraft}
                  className="h-7 gap-1 text-xs"
                >
                  <Copy className="size-3" />
                  {copiedDraft ? t("common.copied") : t("common.copy")}
                </Button>
              </div>
              <pre className="text-xs text-foreground/80 whitespace-pre-wrap bg-muted/30 rounded-lg p-3 font-sans leading-relaxed">
                {result.replyDraft}
              </pre>
            </div>
          )}

          {/* Insights */}
          {result.insights.length > 0 && (
            <div className="glass rounded-xl p-4 border border-border/40">
              <div className="flex items-center gap-2 mb-2">
                <Info className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">תובנות</span>
              </div>
              <ul className="space-y-1.5">
                {result.insights.map((insight, i) => (
                  <li
                    key={i}
                    className="text-xs text-foreground/80 flex gap-2"
                  >
                    <span className="text-muted-foreground shrink-0">•</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
