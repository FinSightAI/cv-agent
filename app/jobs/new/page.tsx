"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { store } from "@/lib/storage";
import { nanoid } from "nanoid";
import { useLang } from "@/components/lang-provider";
import { aiFetchJson } from "@/lib/utils";

type BulkResult = {
  url: string;
  status: "pending" | "done" | "failed";
  title?: string;
  error?: string;
};

const BULK_CONCURRENCY = 3;

export default function NewJobPage() {
  const { t } = useLang();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("url");
  const [bulkText, setBulkText] = useState("");
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  async function handleAdd() {
    if (!url && !text.trim()) {
      toast.error(t("jobs.new.error"));
      return;
    }
    setBusy(true);
    try {
      const data = await aiFetchJson<{
        url?: string;
        parsed: import("@/lib/ai/schemas").ParsedJob;
        rawText: string;
      }>(
        "/api/jobs/parse",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url || undefined, text: text || undefined }),
        },
        { t, fallback: "Parse failed" },
      );
      const id = nanoid(10);
      store.saveJob({
        id,
        url: data.url,
        parsed: data.parsed,
        rawText: data.rawText,
        status: "saved",
        createdAt: new Date().toISOString(),
      });
      toast.success(t("jobs.new.added"));
      router.push(`/jobs/${id}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function parseOneUrl(jobUrl: string, attempt = 1): Promise<void> {
    const res = await fetch("/api/jobs/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: jobUrl }),
    });

    if (res.status === 429) {
      const { retryAfter } = await res.json().catch(() => ({ retryAfter: 15 }));
      if (attempt >= 3) throw new Error(t("error.rateLimit"));
      setBulkResults((prev) =>
        prev.map((r) =>
          r.url === jobUrl ? { ...r, status: "pending", error: `retry in ${retryAfter}s` } : r,
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, (retryAfter + 1) * 1000));
      return parseOneUrl(jobUrl, attempt + 1);
    }

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Parse failed" }));
      throw new Error(error || "Parse failed");
    }

    const data = (await res.json()) as {
      url?: string;
      parsed: import("@/lib/ai/schemas").ParsedJob;
      rawText: string;
    };
    store.saveJob({
      id: nanoid(10),
      url: data.url,
      parsed: data.parsed,
      rawText: data.rawText,
      status: "saved",
      createdAt: new Date().toISOString(),
    });
    setBulkResults((prev) =>
      prev.map((r) => (r.url === jobUrl ? { ...r, status: "done", title: data.parsed.title } : r)),
    );
  }

  async function handleBulkAdd() {
    const urls = Array.from(
      new Set(
        bulkText
          .split("\n")
          .map((u) => u.trim())
          .filter(Boolean),
      ),
    );
    if (urls.length === 0) {
      toast.error(t("jobs.new.error"));
      return;
    }
    setBulkBusy(true);
    setBulkResults(urls.map((u) => ({ url: u, status: "pending" })));

    // Sequential, not concurrent: /api/jobs/parse shares a per-IP budget with
    // every other AI feature (protects the free Gemini quota) — firing this
    // in parallel just burns through it and turns into 429s.
    for (const jobUrl of urls) {
      try {
        await parseOneUrl(jobUrl);
      } catch (err) {
        setBulkResults((prev) =>
          prev.map((r) =>
            r.url === jobUrl ? { ...r, status: "failed", error: (err as Error).message } : r,
          ),
        );
      }
    }
    setBulkBusy(false);
    setBulkResults((prev) => {
      const ok = prev.filter((r) => r.status === "done").length;
      if (ok > 0) toast.success(`${t("jobs.new.added")} (${ok}/${urls.length})`);
      return prev;
    });
  }

  return (
    <div className="container max-w-3xl mx-auto p-6 lg:p-10 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{t("jobs.new.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("jobs.new.subtitle")}</p>
      </header>

      <Card className="glass">
        <CardHeader>
          <CardTitle>{t("jobs.new.cardTitle")}</CardTitle>
          <CardDescription>{t("jobs.new.cardDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="url">{t("jobs.new.tab.url")}</TabsTrigger>
              <TabsTrigger value="text">{t("jobs.new.tab.text")}</TabsTrigger>
              <TabsTrigger value="bulk">{t("jobs.new.tab.bulk")}</TabsTrigger>
            </TabsList>
            <TabsContent value="url" className="pt-4 space-y-2">
              <Label htmlFor="url">{t("jobs.new.urlLabel")}</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                {t("jobs.new.urlNote")}
              </p>
            </TabsContent>
            <TabsContent value="text" className="pt-4 space-y-2">
              <Label htmlFor="text">{t("jobs.new.textLabel")}</Label>
              <Textarea
                id="text"
                rows={14}
                placeholder={t("jobs.new.textPlaceholder")}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </TabsContent>
            <TabsContent value="bulk" className="pt-4 space-y-2">
              <Label htmlFor="bulk">{t("jobs.new.bulkLabel")}</Label>
              <Textarea
                id="bulk"
                rows={8}
                placeholder={t("jobs.new.bulkPlaceholder")}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                dir="ltr"
              />
              {bulkResults.length > 0 && (
                <ul className="text-sm space-y-1 border rounded-md p-3 max-h-64 overflow-y-auto">
                  {bulkResults.map((r) => (
                    <li key={r.url} className="flex items-center gap-2">
                      {r.status === "pending" && (
                        <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                      )}
                      {r.status === "done" && (
                        <CheckCircle2 className="size-3.5 shrink-0 text-green-600" />
                      )}
                      {r.status === "failed" && (
                        <XCircle className="size-3.5 shrink-0 text-destructive" />
                      )}
                      <span className="truncate" dir="ltr">
                        {r.title ?? r.error ?? r.url}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
          <div className="flex justify-end pt-4">
            {activeTab === "bulk" ? (
              <Button onClick={handleBulkAdd} disabled={bulkBusy}>
                {bulkBusy ? (
                  <>
                    <Loader2 className="size-4 me-2 animate-spin" />
                    {t("jobs.new.bulkAdding")}
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 me-2" />
                    {t("jobs.new.bulkAdd")}
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleAdd} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="size-4 me-2 animate-spin" />
                    {t("jobs.new.analyzing")}
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 me-2" />
                    {t("jobs.new.analyze")}
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
