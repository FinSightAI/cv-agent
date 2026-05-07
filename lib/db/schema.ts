import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
  uuid,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// MVP runs single-user; userId column stays for future multi-tenant.
const userIdDefault = sql`'local-user'`;

export const applicationStatus = pgEnum("application_status", [
  "saved",
  "drafting",
  "ready",
  "applied",
  "screen",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
  "ghosted",
]);

export const applicationSource = pgEnum("application_source", [
  "manual",
  "linkedin",
  "greenhouse",
  "lever",
  "ashby",
  "workday",
  "indeed",
  "alljobs",
  "company_page",
  "other",
]);

export const submitMode = pgEnum("submit_mode", [
  "copilot",
  "auto_email",
  "auto_browser",
  "manual",
]);

export const resumes = pgTable("resumes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().default(userIdDefault),
  label: text("label").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  sourceFileUrl: text("source_file_url"),
  sourceMime: text("source_mime"),
  rawText: text("raw_text"),
  parsed: jsonb("parsed").$type<ParsedResume>(),
  language: text("language").default("he"),
  version: integer("version").notNull().default(1),
  parentId: uuid("parent_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [index("resumes_user_idx").on(t.userId)]);

export const jobListings = pgTable("job_listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().default(userIdDefault),
  url: text("url"),
  source: applicationSource("source").notNull().default("manual"),
  externalId: text("external_id"),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  remote: boolean("remote"),
  employmentType: text("employment_type"),
  seniority: text("seniority"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryCurrency: text("salary_currency"),
  rawText: text("raw_text"),
  parsed: jsonb("parsed").$type<ParsedJob>(),
  postedAt: timestamp("posted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("jobs_user_idx").on(t.userId),
  index("jobs_company_idx").on(t.company),
]);

export const matchAnalyses = pgTable("match_analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").notNull().references(() => jobListings.id, { onDelete: "cascade" }),
  resumeId: uuid("resume_id").notNull().references(() => resumes.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  recommendation: text("recommendation").notNull(),
  result: jsonb("result").$type<MatchResult>().notNull(),
  model: text("model"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const coverLetters = pgTable("cover_letters", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").notNull().references(() => jobListings.id, { onDelete: "cascade" }),
  resumeId: uuid("resume_id").notNull().references(() => resumes.id, { onDelete: "cascade" }),
  language: text("language").notNull().default("he"),
  tone: text("tone").default("professional"),
  body: text("body").notNull(),
  feedback: text("feedback"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().default(userIdDefault),
  jobId: uuid("job_id").notNull().references(() => jobListings.id, { onDelete: "cascade" }),
  resumeId: uuid("resume_id").references(() => resumes.id, { onDelete: "set null" }),
  coverLetterId: uuid("cover_letter_id").references(() => coverLetters.id, { onDelete: "set null" }),
  status: applicationStatus("status").notNull().default("saved"),
  submitMode: submitMode("submit_mode").default("copilot"),
  appliedAt: timestamp("applied_at"),
  notes: text("notes"),
  followUpAt: timestamp("follow_up_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("apps_user_idx").on(t.userId),
  index("apps_status_idx").on(t.status),
]);

export const applicationEvents = pgTable("application_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const preferences = pgTable("preferences", {
  userId: text("user_id").primaryKey().default(userIdDefault),
  data: jsonb("data").$type<UserPreferences>().notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const siteCredentials = pgTable("site_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().default(userIdDefault),
  source: applicationSource("source").notNull(),
  label: text("label"),
  // Encrypt at rest in production; for MVP store opaque blob.
  secretCipher: text("secret_cipher"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- JSONB shapes ----------

export type ParsedResume = {
  fullName?: string;
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  links?: { label: string; url: string }[];
  summary?: string;
  skills?: string[];
  languages?: { name: string; level?: string }[];
  experience?: {
    company: string;
    title: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    bullets?: string[];
  }[];
  education?: {
    institution: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
  }[];
  certifications?: { name: string; issuer?: string; date?: string }[];
  projects?: { name: string; description?: string; url?: string }[];
};

export type ParsedJob = {
  summary?: string;
  responsibilities?: string[];
  requirements?: { text: string; required: boolean }[];
  niceToHave?: string[];
  techStack?: string[];
  benefits?: string[];
  keywords?: string[];
};

export type MatchResult = {
  score: number; // 0-100
  recommendation: "apply" | "tailor_first" | "skip";
  reason: string;
  strengths: string[];
  gaps: { requirement: string; severity: "blocker" | "major" | "minor"; mitigation?: string }[];
  hardRequirementsMet: boolean;
  suggestedResumeEdits: { section: string; change: string }[];
  keywordsToAdd: string[];
  estimatedFitNotes?: string;
};

export type UserPreferences = {
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
  industries?: string[];
  preferredLanguages?: string[];
  defaultLetterTone?: "professional" | "warm" | "concise" | "enthusiastic";
};
