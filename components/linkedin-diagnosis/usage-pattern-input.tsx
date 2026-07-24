"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLang } from "@/components/lang-provider";
import type { LinkedInUsagePatternInput } from "@/lib/ai/schemas";

export function UsagePatternInput({
  value,
  onChange,
}: {
  value: LinkedInUsagePatternInput;
  onChange: (v: LinkedInUsagePatternInput) => void;
}) {
  const { t } = useLang();

  function set<K extends keyof LinkedInUsagePatternInput>(key: K, v: LinkedInUsagePatternInput[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t("linkedin.diag.usage.activityFrequency")}</Label>
        <Select
          value={value.activityFrequency}
          onValueChange={(v) =>
            set("activityFrequency", v as LinkedInUsagePatternInput["activityFrequency"])
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">{t("linkedin.diag.usage.freqDaily")}</SelectItem>
            <SelectItem value="weekly">{t("linkedin.diag.usage.freqWeekly")}</SelectItem>
            <SelectItem value="rarely">{t("linkedin.diag.usage.freqRarely")}</SelectItem>
            <SelectItem value="never">{t("linkedin.diag.usage.freqNever")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>{t("linkedin.diag.usage.postsOrEngages")}</Label>
        <Select
          value={value.postsOrEngages ? "yes" : "no"}
          onValueChange={(v) => set("postsOrEngages", v === "yes")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">{t("linkedin.diag.usage.yes")}</SelectItem>
            <SelectItem value="no">{t("linkedin.diag.usage.no")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>{t("linkedin.diag.usage.receivedRecruiterMessages")}</Label>
        <Select
          value={value.receivedRecruiterMessages}
          onValueChange={(v) =>
            set("receivedRecruiterMessages", v as LinkedInUsagePatternInput["receivedRecruiterMessages"])
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">{t("linkedin.diag.usage.yes")}</SelectItem>
            <SelectItem value="no">{t("linkedin.diag.usage.no")}</SelectItem>
            <SelectItem value="unsure">{t("linkedin.diag.usage.unsure")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>{t("linkedin.diag.usage.sendsConnectionRequests")}</Label>
        <Select
          value={value.sendsConnectionRequests}
          onValueChange={(v) =>
            set("sendsConnectionRequests", v as LinkedInUsagePatternInput["sendsConnectionRequests"])
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="often">{t("linkedin.diag.usage.connOften")}</SelectItem>
            <SelectItem value="sometimes">{t("linkedin.diag.usage.connSometimes")}</SelectItem>
            <SelectItem value="never">{t("linkedin.diag.usage.connNever")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
