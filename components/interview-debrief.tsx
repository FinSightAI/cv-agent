"use client";

import { useEffect, useState } from "react";
import type { StoredJob, InterviewDebrief } from "@/lib/storage";
import { store } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  Circle,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/components/lang-provider";

type RatingField = keyof Omit<
  InterviewDebrief,
  "hardestQuestion" | "wouldDoDifferently" | "recordedAt"
>;

const RATING_FIELDS: { key: RatingField; labelKey: string }[] = [
  { key: "confidence", labelKey: "debrief.confidence" },
  { key: "technicalPrep", labelKey: "debrief.technicalPrep" },
  { key: "rapportWithInterviewer", labelKey: "debrief.rapport" },
  { key: "communicationClarity", labelKey: "debrief.clarity" },
  { key: "overallPreparation", labelKey: "debrief.preparation" },
];

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="focus:outline-none transition-transform active:scale-90"
          aria-label={`${n} stars`}
        >
          {n <= value ? (
            <CheckCircle2 className="size-5 text-amber-400" />
          ) : (
            <Circle className="size-5 text-muted-foreground/30 hover:text-amber-400/50 transition-colors" />
          )}
        </button>
      ))}
    </div>
  );
}

function AggregatePatterns({ jobs }: { jobs: StoredJob[] }) {
  const debriefs = jobs
    .filter((j) => j.debrief)
    .map((j) => j.debrief as InterviewDebrief);

  if (debriefs.length < 2) return null;

  const avg = (key: RatingField) =>
    Math.round(
      (debriefs.reduce((s, d) => s + d[key], 0) / debriefs.length) * 10,
    ) / 10;

  const avgConfidence = avg("confidence");
  const avgTech = avg("technicalPrep");
  const avgRapport = avg("rapportWithInterviewer");
  const avgClarity = avg("communicationClarity");
  const avgPrep = avg("overallPreparation");

  const lowestField = [
    { label: "ביטחון עצמי", score: avgConfidence },
    { label: "ידע טכני", score: avgTech },
    { label: "כימיה", score: avgRapport },
    { label: "תקשורת", score: avgClarity },
    { label: "מוכנות", score: avgPrep },
  ].sort((a, b) => a.score - b.score)[0];

  return (
    <div className="glass rounded-xl p-4 border border-border/40 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="size-4 text-blue-400" />
        <span className="text-sm font-medium">
          ניתוח דפוסים ({debriefs.length} ראיונות)
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: "ביטחון", score: avgConfidence },
          { label: "טכני", score: avgTech },
          { label: "כימיה", score: avgRapport },
          { label: "תקשורת", score: avgClarity },
          { label: "מוכנות", score: avgPrep },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <div
              className={`text-lg font-bold tabular-nums ${
                item.score >= 4
                  ? "text-green-400"
                  : item.score >= 3
                    ? "text-amber-400"
                    : "text-red-400"
              }`}
            >
              {item.score}
            </div>
            <div className="text-[10px] text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </div>
      {lowestField && lowestField.score < 3.5 && (
        <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
          דגש לשיפור:{" "}
          <span className="text-foreground font-medium">{lowestField.label}</span>{" "}
          — ממוצע {lowestField.score}/5 בכלל הראיונות
        </p>
      )}
    </div>
  );
}

export function InterviewDebrief({ job }: { job: StoredJob }) {
  const { t } = useLang();
  const [saved, setSaved] = useState(false);
  const [allJobs, setAllJobs] = useState<StoredJob[]>([]);

  const existing = job.debrief;

  const [ratings, setRatings] = useState<Record<RatingField, number>>(
    existing
      ? {
          confidence: existing.confidence,
          technicalPrep: existing.technicalPrep,
          rapportWithInterviewer: existing.rapportWithInterviewer,
          communicationClarity: existing.communicationClarity,
          overallPreparation: existing.overallPreparation,
        }
      : {
          confidence: 0,
          technicalPrep: 0,
          rapportWithInterviewer: 0,
          communicationClarity: 0,
          overallPreparation: 0,
        },
  );

  const [hardestQuestion, setHardestQuestion] = useState(
    existing?.hardestQuestion ?? "",
  );
  const [wouldDoDifferently, setWouldDoDifferently] = useState(
    existing?.wouldDoDifferently ?? "",
  );

  useEffect(() => {
    setAllJobs(store.getJobs());
  }, []);

  if (job.status !== "interview") return null;

  function saveDebrief() {
    const debrief: InterviewDebrief = {
      ...ratings,
      hardestQuestion,
      wouldDoDifferently,
      recordedAt: new Date().toISOString(),
    };
    const updated = { ...job, debrief };
    store.saveJob(updated);
    setSaved(true);
    toast.success(t("debrief.saved"));
    setTimeout(() => setSaved(false), 3000);
  }

  const allFilled = Object.values(ratings).every((v) => v > 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass rounded-xl p-4 border border-border/40">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList className="size-4 text-blue-400" />
          <h3 className="text-sm font-semibold">{t("debrief.title")}</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          רפלקציה מהירה אחרי הראיון — עוזרת לשפר לאורך זמן
        </p>
      </div>

      {/* Rating questions */}
      <div className="glass rounded-xl p-4 border border-border/40 space-y-4">
        {RATING_FIELDS.map(({ key, labelKey }) => (
          <div
            key={key}
            className="flex items-center justify-between gap-3"
          >
            <Label className="text-sm text-foreground/80 flex-1">
              {t(labelKey as Parameters<typeof t>[0])}
            </Label>
            <StarRating
              value={ratings[key]}
              onChange={(v) =>
                setRatings((prev) => ({ ...prev, [key]: v }))
              }
            />
          </div>
        ))}
      </div>

      {/* Open-ended questions */}
      <div className="glass rounded-xl p-4 border border-border/40 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {t("debrief.hardest")}
          </Label>
          <Textarea
            value={hardestQuestion}
            onChange={(e) => setHardestQuestion(e.target.value)}
            placeholder="מה היה הכי קשה לענות עליו?"
            className="bg-background/50 resize-none min-h-[72px] text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {t("debrief.different")}
          </Label>
          <Textarea
            value={wouldDoDifferently}
            onChange={(e) => setWouldDoDifferently(e.target.value)}
            placeholder="אם היית חוזר, מה היית עושה אחרת?"
            className="bg-background/50 resize-none min-h-[72px] text-sm"
          />
        </div>
      </div>

      {/* Save button */}
      <Button
        onClick={saveDebrief}
        disabled={!allFilled}
        className="w-full"
        variant={saved ? "outline" : "default"}
      >
        {saved ? (
          <>
            <CheckCircle2 className="size-4 me-2 text-green-500" />
            {t("debrief.saved")}
          </>
        ) : (
          t("debrief.save")
        )}
      </Button>

      {/* Aggregate patterns */}
      <AggregatePatterns jobs={allJobs} />
    </div>
  );
}
