"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { dictionary, type Key, type Lang } from "@/lib/i18n/dictionary";

type LangCtx = {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (l: Lang) => void;
  t: (key: Key) => string;
};

const Ctx = createContext<LangCtx | null>(null);

const STORAGE_KEY = "cv-agent:lang";

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("he");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved =
      (typeof window !== "undefined" &&
        (localStorage.getItem(STORAGE_KEY) as Lang | null)) ||
      "he";
    setLangState(saved);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const dir = lang === "he" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang, hydrated]);

  const value: LangCtx = {
    lang,
    dir: lang === "he" ? "rtl" : "ltr",
    setLang: setLangState,
    t: (key) => dictionary[lang][key] ?? key,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLang must be used inside <LangProvider>");
  return ctx;
}
