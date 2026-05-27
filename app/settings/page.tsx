"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { store, type StoredPreferences } from "@/lib/storage";
import { useLang } from "@/components/lang-provider";
import type { Key } from "@/lib/i18n/dictionary";

const EMPTY: StoredPreferences = {
  targetRoles: [],
  seniority: [],
  locations: [],
  remoteOk: true,
  hybridOk: true,
  techMust: [],
  techNice: [],
  dealbreakers: [],
  preferredLanguages: ["he", "en"],
  defaultLetterTone: "professional",
};

export default function SettingsPage() {
  const { t } = useLang();
  const [prefs, setPrefs] = useState<StoredPreferences>(EMPTY);

  useEffect(() => {
    const stored = store.getPrefs();
    if (stored) setPrefs({ ...EMPTY, ...stored });
  }, []);

  function save() {
    store.setPrefs(prefs);
    toast.success(t("settings.saved"));
  }

  return (
    <div className="container max-w-3xl mx-auto p-6 lg:p-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("settings.subtitle")}</p>
      </header>

      <Card className="glass">
        <CardHeader>
          <CardTitle>{t("settings.search.title")}</CardTitle>
          <CardDescription>{t("settings.search.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldList
            labelKey="settings.targetRoles"
            placeholderKey="settings.targetRoles.placeholder"
            value={prefs.targetRoles ?? []}
            onChange={(targetRoles) => setPrefs({ ...prefs, targetRoles })}
          />
          <FieldList
            labelKey="settings.seniority"
            placeholderKey="settings.seniority.placeholder"
            value={prefs.seniority ?? []}
            onChange={(seniority) => setPrefs({ ...prefs, seniority })}
          />
          <FieldList
            labelKey="settings.locations"
            placeholderKey="settings.locations.placeholder"
            value={prefs.locations ?? []}
            onChange={(locations) => setPrefs({ ...prefs, locations })}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("settings.salaryMin")}</Label>
              <Input
                type="number"
                value={prefs.salaryMin ?? ""}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    salaryMin: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>{t("settings.currency")}</Label>
              <Select
                value={prefs.currency ?? "ILS"}
                onValueChange={(currency) =>
                  setPrefs({ ...prefs, currency: currency ?? undefined })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ILS">₪ ILS</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                  <SelectItem value="EUR">€ EUR</SelectItem>
                  <SelectItem value="GBP">£ GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>{t("settings.tech.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldList
            labelKey="settings.techMust"
            placeholderKey="settings.techMust.placeholder"
            value={prefs.techMust ?? []}
            onChange={(techMust) => setPrefs({ ...prefs, techMust })}
          />
          <FieldList
            labelKey="settings.techNice"
            placeholderKey="settings.techNice.placeholder"
            value={prefs.techNice ?? []}
            onChange={(techNice) => setPrefs({ ...prefs, techNice })}
          />
          <FieldList
            labelKey="settings.dealbreakers"
            placeholderKey="settings.dealbreakers.placeholder"
            value={prefs.dealbreakers ?? []}
            onChange={(dealbreakers) => setPrefs({ ...prefs, dealbreakers })}
          />
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Workday</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>{t("settings.workdayBoards")}</Label>
          <Textarea
            value={(prefs.workdayBoards ?? []).join("\n")}
            onChange={(e) =>
              setPrefs({
                ...prefs,
                workdayBoards: e.target.value
                  .split(/[\n,]/)
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder={t("settings.workdayBoards.placeholder")}
            rows={3}
            dir="ltr"
          />
          <p className="text-xs text-muted-foreground">
            {t("settings.workdayBoards.help")}
          </p>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>{t("settings.letter.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={prefs.defaultLetterTone ?? "professional"}
            onValueChange={(v) =>
              setPrefs({
                ...prefs,
                defaultLetterTone: v as StoredPreferences["defaultLetterTone"],
              })
            }
          >
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">{t("job.letter.tone.professional")}</SelectItem>
              <SelectItem value="warm">{t("job.letter.tone.warm")}</SelectItem>
              <SelectItem value="concise">{t("job.letter.tone.concise")}</SelectItem>
              <SelectItem value="enthusiastic">{t("job.letter.tone.enthusiastic")}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t("settings.alert.title")}
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              {t("settings.alert.badge")}
            </span>
          </CardTitle>
          <CardDescription>{t("settings.alert.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">{t("settings.alert.envNote")}</p>
          <div className="rounded-lg bg-muted/30 border border-border/50 p-4 space-y-1.5 font-mono text-xs" dir="ltr">
            <div><span className="text-primary">DAILY_ALERT_EMAIL</span> = <span className="text-muted-foreground">{t("settings.alert.emailPlaceholder")}</span></div>
            <div><span className="text-primary">DAILY_ALERT_ROLES</span> = <span className="text-muted-foreground">{prefs.targetRoles?.length ? prefs.targetRoles.join(", ") : t("settings.alert.rolesPlaceholder")}</span></div>
            <div><span className="text-primary">DAILY_ALERT_LOCATION</span> = <span className="text-muted-foreground">{prefs.locations?.[0] ?? "Israel"}</span></div>
            <div><span className="text-primary">RESEND_API_KEY</span> = <span className="text-muted-foreground">re_...</span></div>
            <div><span className="text-primary">CRON_SECRET</span> = <span className="text-muted-foreground">{t("settings.alert.secretPlaceholder")}</span></div>
          </div>
          <div className="flex gap-3 flex-wrap text-xs">
            <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer" className="text-primary hover:underline">{t("settings.alert.getResendKey")} →</a>
            <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" className="text-primary hover:underline">{t("settings.alert.openVercel")} →</a>
          </div>
          <p className="text-xs text-muted-foreground">{t("settings.alert.schedule")}</p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save}>{t("common.save")}</Button>
      </div>
    </div>
  );
}

function FieldList({
  labelKey,
  placeholderKey,
  value,
  onChange,
}: {
  labelKey: Key;
  placeholderKey?: Key;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const { t } = useLang();
  return (
    <div className="space-y-1">
      <Label>{t(labelKey)}</Label>
      <Textarea
        placeholder={placeholderKey ? t(placeholderKey) : ""}
        value={value.join(", ")}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
        rows={2}
      />
      <p className="text-xs text-muted-foreground">{t("settings.commaSeparated")}</p>
    </div>
  );
}
