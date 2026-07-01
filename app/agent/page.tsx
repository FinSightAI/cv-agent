"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Loader2, User, Bot, RotateCcw } from "lucide-react";
import { useLang } from "@/components/lang-provider";
import { store, type StoredJob } from "@/lib/storage";
import type { ParsedResume } from "@/lib/ai/schemas";
import type { Key } from "@/lib/i18n/dictionary";

const SUGGESTION_KEYS: Key[] = [
  "agent.suggestion.1",
  "agent.suggestion.2",
  "agent.suggestion.3",
  "agent.suggestion.4",
];

export default function AgentPage() {
  const { t, lang } = useLang();
  const [resume, setResume] = useState<ParsedResume | null>(null);
  const [jobs, setJobs] = useState<StoredJob[]>([]);
  const [prefs, setPrefs] = useState<unknown>(null);
  const [input, setInput] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Refs keep the latest state accessible inside the stable transport closure
  const resumeRef = useRef<ParsedResume | null>(null);
  const jobsRef = useRef<StoredJob[]>([]);
  const prefsRef = useRef<unknown>(null);
  const langRef = useRef(lang);
  resumeRef.current = resume;
  jobsRef.current = jobs;
  prefsRef.current = prefs;
  langRef.current = lang;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages,
            resume: resumeRef.current,
            jobs: jobsRef.current.map((j) => ({
              id: j.id,
              title: j.parsed.title,
              company: j.parsed.company,
              status: j.status,
              matchScore: j.match?.score ?? null,
              recommendation: j.match?.recommendation ?? null,
              parsed: {
                location: j.parsed.location,
                remote: j.parsed.remote,
                seniority: j.parsed.seniority,
                keywords: j.parsed.keywords,
              },
              createdAt: j.createdAt,
              appliedAt: j.appliedAt,
            })),
            preferences: prefsRef.current,
            language: langRef.current,
          },
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, setMessages } = useChat({ transport });

  useEffect(() => {
    const r = store.getResume();
    setResume(r?.parsed ?? null);
    setJobs(store.getJobs());
    setPrefs(store.getPrefs());
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const busy = status === "submitted" || status === "streaming";
  const suggestions = SUGGESTION_KEYS.map((k) => t(k));

  function handleSend(text?: string) {
    const value = (text ?? input).trim();
    if (!value || busy) return;
    sendMessage({ text: value });
    setInput("");
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-6 lg:p-10 space-y-4 md:space-y-6 h-[calc(100dvh-10rem)] md:h-[calc(100dvh-2rem)] flex flex-col">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="size-7 text-primary" />
            {t("agent.title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("agent.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
            Gemini 2.5
          </Badge>
          {messages.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMessages([])}
              disabled={busy}
            >
              <RotateCcw className="size-3.5 me-1" />
              {t("agent.reset")}
            </Button>
          )}
        </div>
      </header>

      <Card className="glass flex-1 flex flex-col min-h-0">
        <CardContent
          ref={scrollerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
              <div className="size-16 rounded-2xl bg-gradient-to-br from-primary/30 to-fuchsia-500/30 grid place-items-center border border-primary/30">
                <Bot className="size-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                {t("agent.greeting")}
              </p>
              <div className="grid sm:grid-cols-2 gap-2 w-full max-w-xl">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="text-start text-sm rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all px-3 py-2"
                  >
                    {s}
                  </button>
                ))}
              </div>
              {!resume && (
                <p className="text-xs text-amber-500 mt-2">
                  💡 {t("agent.tip")}
                </p>
              )}
            </div>
          )}

          {messages.map((m) => (
            <Message key={m.id} role={m.role} parts={m.parts} />
          ))}

          {status === "submitted" && (
            <div className="flex gap-3">
              <div className="size-8 rounded-lg bg-primary/15 grid place-items-center shrink-0">
                <Bot className="size-4 text-primary" />
              </div>
              <div className="flex items-center gap-1 pt-2">
                <span className="size-1.5 rounded-full bg-primary/60 animate-pulse" />
                <span
                  className="size-1.5 rounded-full bg-primary/60 animate-pulse"
                  style={{ animationDelay: "200ms" }}
                />
                <span
                  className="size-1.5 rounded-full bg-primary/60 animate-pulse"
                  style={{ animationDelay: "400ms" }}
                />
              </div>
            </div>
          )}
        </CardContent>

        <div className="border-t border-border/50 p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2 items-end"
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t("agent.placeholder")}
              rows={1}
              className="min-h-[44px] max-h-32 resize-none flex-1"
              disabled={busy}
            />
            <Button type="submit" disabled={busy || !input.trim()} size="icon">
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

type MessagePart = { type: string; text?: string };

function Message({ role, parts }: { role: string; parts: MessagePart[] }) {
  const isUser = role === "user";
  const text = parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`size-8 rounded-lg grid place-items-center shrink-0 ${
          isUser
            ? "bg-secondary text-secondary-foreground"
            : "bg-primary/15 text-primary"
        }`}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted/50 border border-border/50"
        }`}
      >
        {text}
      </div>
    </div>
  );
}
