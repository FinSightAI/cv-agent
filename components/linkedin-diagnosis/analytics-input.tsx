"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLang } from "@/components/lang-provider";
import type { LinkedInAnalyticsInput } from "@/lib/ai/schemas";

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </div>
  );
}

export function AnalyticsInput({
  value,
  onChange,
}: {
  value: LinkedInAnalyticsInput;
  onChange: (v: LinkedInAnalyticsInput) => void;
}) {
  const { t } = useLang();

  function set<K extends keyof LinkedInAnalyticsInput>(key: K, v: LinkedInAnalyticsInput[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{t("linkedin.diag.analytics.ssiLink")}</p>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label={t("linkedin.diag.analytics.ssiTotal")}
          value={value.ssiTotal}
          onChange={(v) => set("ssiTotal", v ?? 0)}
        />
        <NumberField
          label={t("linkedin.diag.analytics.ssiBrand")}
          value={value.ssiBrand}
          onChange={(v) => set("ssiBrand", v ?? 0)}
        />
        <NumberField
          label={t("linkedin.diag.analytics.ssiFindPeople")}
          value={value.ssiFindPeople}
          onChange={(v) => set("ssiFindPeople", v ?? 0)}
        />
        <NumberField
          label={t("linkedin.diag.analytics.ssiEngage")}
          value={value.ssiEngage}
          onChange={(v) => set("ssiEngage", v ?? 0)}
        />
        <NumberField
          label={t("linkedin.diag.analytics.ssiRelationships")}
          value={value.ssiRelationships}
          onChange={(v) => set("ssiRelationships", v ?? 0)}
        />
        <NumberField
          label={t("linkedin.diag.analytics.ssiIndustryAvg")}
          value={value.ssiIndustryAvg}
          onChange={(v) => set("ssiIndustryAvg", v)}
        />
        <NumberField
          label={t("linkedin.diag.analytics.ssiNetworkAvg")}
          value={value.ssiNetworkAvg}
          onChange={(v) => set("ssiNetworkAvg", v)}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <NumberField
          label={t("linkedin.diag.analytics.searchAppearances")}
          value={value.searchAppearances7d}
          onChange={(v) => set("searchAppearances7d", v ?? 0)}
        />
        <NumberField
          label={t("linkedin.diag.analytics.profileViews")}
          value={value.profileViews7d}
          onChange={(v) => set("profileViews7d", v ?? 0)}
        />
        <NumberField
          label={t("linkedin.diag.analytics.postImpressions")}
          value={value.postImpressions7d}
          onChange={(v) => set("postImpressions7d", v ?? 0)}
        />
      </div>
    </div>
  );
}
