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
import { Download, Upload, Trash2 } from "lucide-react";

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

      {/* Data management */}
      <DataManagementCard />
    </div>
  );
}

function DataManagementCard() {
  const { t } = useLang();

  function exportData() {
    const data = {
      resume: localStorage.getItem("cv-agent:resume:v1"),
      jobs: localStorage.getItem("cv-agent:jobs:v1"),
      prefs: localStorage.getItem("cv-agent:prefs:v1"),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cv-agent-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("גיבוי הורד");
  }

  function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.resume) localStorage.setItem("cv-agent:resume:v1", data.resume);
        if (data.jobs) localStorage.setItem("cv-agent:jobs:v1", data.jobs);
        if (data.prefs) localStorage.setItem("cv-agent:prefs:v1", data.prefs);
        toast.success("הנתונים יובאו — רענן את הדף");
        setTimeout(() => window.location.reload(), 1000);
      } catch {
        toast.error("קובץ לא תקין");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function clearData() {
    if (!confirm("למחוק את כל הנתונים? פעולה זו אינה הפיכה.")) return;
    localStorage.removeItem("cv-agent:resume:v1");
    localStorage.removeItem("cv-agent:jobs:v1");
    localStorage.removeItem("cv-agent:prefs:v1");
    toast.success("הנתונים נמחקו");
    setTimeout(() => window.location.reload(), 800);
  }

  return (
    <Card className="glass border-border/40">
      <CardHeader>
        <CardTitle className="text-base">ניהול נתונים</CardTitle>
        <CardDescription>גיבוי, ייבוא, ומחיקה של כל הנתונים המקומיים</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm" onClick={exportData}>
          <Download className="size-4 me-2" />
          ייצא גיבוי
        </Button>
        <label className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors">
          <Upload className="size-4" />
          ייבא גיבוי
          <input type="file" accept=".json" className="hidden" onChange={importData} />
        </label>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60"
          onClick={clearData}
        >
          <Trash2 className="size-4 me-2" />
          מחק הכל
        </Button>
      </CardContent>
    </Card>
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
