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
import { Sparkles, Loader2 } from "lucide-react";
import { store } from "@/lib/storage";
import { nanoid } from "nanoid";
import { useLang } from "@/components/lang-provider";

export default function NewJobPage() {
  const { t } = useLang();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    if (!url && !text.trim()) {
      toast.error(t("jobs.new.error"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/jobs/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url || undefined, text: text || undefined }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Parse failed" }));
        throw new Error(error);
      }
      const data = await res.json();
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
          <Tabs defaultValue="url">
            <TabsList>
              <TabsTrigger value="url">{t("jobs.new.tab.url")}</TabsTrigger>
              <TabsTrigger value="text">{t("jobs.new.tab.text")}</TabsTrigger>
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
          </Tabs>
          <div className="flex justify-end pt-4">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
