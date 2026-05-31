"use client";

// MVP local storage for resume + jobs until DB is connected.
// Replace with Drizzle queries once DATABASE_URL is set.

import type {
  ParsedJob,
  ParsedResume,
  MatchResult,
  TailoredResume,
  CVSuggestions,
  InterviewPrep,
} from "@/lib/ai/schemas";

export type InterviewDebrief = {
  confidence: number;
  technicalPrep: number;
  rapportWithInterviewer: number;
  communicationClarity: number;
  overallPreparation: number;
  hardestQuestion: string;
  wouldDoDifferently: string;
  recordedAt: string;
};

const RESUME_KEY = "cv-agent:resume:v1";
const JOBS_KEY = "cv-agent:jobs:v1";
const PREFS_KEY = "cv-agent:prefs:v1";

export type StoredResume = {
  parsed: ParsedResume;
  rawText: string;
  updatedAt: string;
};

export type StoredJob = {
  id: string;
  url?: string;
  parsed: ParsedJob;
  rawText: string;
  match?: MatchResult;
  coverLetter?: string;
  tailoredResume?: TailoredResume;
  suggestions?: CVSuggestions;
  interviewPrep?: InterviewPrep;
  status:
    | "saved"
    | "drafting"
    | "ready"
    | "applied"
    | "screen"
    | "interview"
    | "offer"
    | "rejected"
    | "withdrawn"
    | "ghosted";
  notes?: string;
  appliedAt?: string;
  followUpAt?: string;
  debrief?: InterviewDebrief;
  createdAt: string;
};

export type StoredPreferences = {
  targetRoles?: string[];
  seniority?: string[];
  locations?: string[];
  remoteOk?: boolean;
  hybridOk?: boolean;
  salaryMin?: number;
  currency?: string;
  techMust?: string[];
  techNice?: string[];
  dealbreakers?: string[];
  preferredLanguages?: string[];
  defaultLetterTone?: "professional" | "warm" | "concise" | "enthusiastic";
  workdayBoards?: string[];
  searchRecentDays?: 1 | 3 | 7 | 14 | 30;
};

function safeParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export const store = {
  getResume(): StoredResume | null {
    if (typeof window === "undefined") return null;
    return safeParse<StoredResume>(localStorage.getItem(RESUME_KEY));
  },
  setResume(r: StoredResume) {
    localStorage.setItem(RESUME_KEY, JSON.stringify(r));
  },
  clearResume() {
    localStorage.removeItem(RESUME_KEY);
  },

  getJobs(): StoredJob[] {
    if (typeof window === "undefined") return [];
    return safeParse<StoredJob[]>(localStorage.getItem(JOBS_KEY)) ?? [];
  },
  saveJob(j: StoredJob) {
    const list = this.getJobs();
    const idx = list.findIndex((x) => x.id === j.id);
    if (idx >= 0) list[idx] = j;
    else list.unshift(j);
    localStorage.setItem(JOBS_KEY, JSON.stringify(list));
  },
  getJob(id: string): StoredJob | undefined {
    return this.getJobs().find((j) => j.id === id);
  },
  deleteJob(id: string) {
    const list = this.getJobs().filter((j) => j.id !== id);
    localStorage.setItem(JOBS_KEY, JSON.stringify(list));
  },

  getPrefs(): StoredPreferences | null {
    if (typeof window === "undefined") return null;
    return safeParse<StoredPreferences>(localStorage.getItem(PREFS_KEY));
  },
  setPrefs(p: StoredPreferences) {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  },
};
