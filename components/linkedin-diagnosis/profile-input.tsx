"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { useLang } from "@/components/lang-provider";
import type { LinkedInProfileInput } from "@/lib/ai/schemas";

export function ProfileInput({
  value,
  onChange,
}: {
  value: LinkedInProfileInput;
  onChange: (v: LinkedInProfileInput) => void;
}) {
  const { t } = useLang();
  const [skillInput, setSkillInput] = useState("");

  function set<K extends keyof LinkedInProfileInput>(key: K, v: LinkedInProfileInput[K]) {
    onChange({ ...value, [key]: v });
  }

  function addSkill() {
    const trimmed = skillInput.trim();
    if (!trimmed || value.skills.includes(trimmed)) return;
    set("skills", [...value.skills, trimmed]);
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    set(
      "skills",
      value.skills.filter((s) => s !== skill),
    );
  }

  function addExperience() {
    set("experience", [...value.experience, { company: "", role: "", description: "" }]);
  }

  function updateExperience(i: number, field: "company" | "role" | "description", v: string) {
    const next = value.experience.slice();
    next[i] = { ...next[i], [field]: v };
    set("experience", next);
  }

  function removeExperience(i: number) {
    set(
      "experience",
      value.experience.filter((_, idx) => idx !== i),
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t("linkedin.diag.profile.headline")}</Label>
        <Input value={value.headline} onChange={(e) => set("headline", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>{t("linkedin.diag.profile.openToWork")}</Label>
        <Select
          value={value.openToWork}
          onValueChange={(v) => set("openToWork", v as LinkedInProfileInput["openToWork"])}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="off">{t("linkedin.diag.profile.openToWorkOff")}</SelectItem>
            <SelectItem value="recruiters">{t("linkedin.diag.profile.openToWorkRecruiters")}</SelectItem>
            <SelectItem value="all">{t("linkedin.diag.profile.openToWorkAll")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{t("linkedin.diag.profile.location")}</Label>
          <Input value={value.location} onChange={(e) => set("location", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("linkedin.diag.profile.connections")}</Label>
          <Input value={value.connectionsCount} onChange={(e) => set("connectionsCount", e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t("linkedin.diag.profile.about")}</Label>
        <Textarea rows={5} value={value.about} onChange={(e) => set("about", e.target.value)} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t("linkedin.diag.profile.experience")}</Label>
          <Button type="button" size="sm" variant="outline" onClick={addExperience}>
            <Plus className="size-4" />
            {t("linkedin.diag.profile.experienceAdd")}
          </Button>
        </div>
        {value.experience.map((exp, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border/40 p-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder={t("linkedin.diag.profile.experienceCompany")}
                value={exp.company}
                onChange={(e) => updateExperience(i, "company", e.target.value)}
              />
              <Input
                placeholder={t("linkedin.diag.profile.experienceRole")}
                value={exp.role}
                onChange={(e) => updateExperience(i, "role", e.target.value)}
              />
              <Button type="button" size="icon" variant="ghost" onClick={() => removeExperience(i)}>
                <X className="size-4" />
              </Button>
            </div>
            <Textarea
              rows={3}
              placeholder={t("linkedin.diag.profile.experienceDesc")}
              value={exp.description}
              onChange={(e) => updateExperience(i, "description", e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label>{t("linkedin.diag.profile.education")}</Label>
        <Textarea rows={2} value={value.education} onChange={(e) => set("education", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>{t("linkedin.diag.profile.certifications")}</Label>
        <Textarea rows={2} value={value.certifications} onChange={(e) => set("certifications", e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>{t("linkedin.diag.profile.skills")}</Label>
        {value.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {value.skills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors text-xs"
                onClick={() => removeSkill(skill)}
              >
                {skill}
                <X className="size-3" />
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill();
              }
            }}
          />
          <Button type="button" size="sm" variant="outline" onClick={addSkill}>
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t("linkedin.diag.profile.recommendations")}</Label>
        <Textarea
          rows={2}
          value={value.recommendations}
          onChange={(e) => set("recommendations", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t("linkedin.diag.profile.projects")}</Label>
        <Textarea rows={2} value={value.projects} onChange={(e) => set("projects", e.target.value)} />
      </div>
    </div>
  );
}
