"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  Download,
  Eye,
  Plus,
  X,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  emptyProfile,
  profileBuildingBlocks,
  profileTemplates,
  toProfile,
  type AnonymizedProfile,
  type ProfileTemplate,
} from "@/lib/candidate-profile";
import { saveAnonymizedProfile } from "@/app/(app)/kandidaten/actions";

type ChipField = "qualifications" | "industry_experience" | "certificates" | "skills";

export function ProfileEditor({
  candidateId,
  initialTitle,
  initialProfile,
}: {
  candidateId: string;
  initialTitle: string | null;
  initialProfile: unknown;
}) {
  const [title, setTitle] = useState(initialTitle ?? "");
  const [profile, setProfile] = useState<AnonymizedProfile>(
    () => toProfile(initialProfile) ?? emptyProfile
  );
  const [template, setTemplate] = useState<ProfileTemplate>("standard");
  const [chipDraft, setChipDraft] = useState<Record<ChipField, string>>({
    qualifications: "",
    industry_experience: "",
    certificates: "",
    skills: "",
  });
  const [savedState, setSavedState] = useState<"idle" | "saved">("idle");
  const [isPending, startTransition] = useTransition();
  const editorRef = useRef<HTMLDivElement>(null);

  const pdfPreviewUrl = `/kandidaten/${candidateId}/pdf`;

  function addChip(field: ChipField, value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setProfile((prev) =>
      prev[field].includes(trimmed) ? prev : { ...prev, [field]: [...prev[field], trimmed] }
    );
  }

  function removeChip(field: ChipField, value: string) {
    setProfile((prev) => ({ ...prev, [field]: prev[field].filter((v) => v !== value) }));
  }

  function addWorkHistoryEntry() {
    setProfile((prev) => ({
      ...prev,
      work_history: [...prev.work_history, { role: "", period: "", description: "" }],
    }));
  }

  function updateWorkHistoryEntry(index: number, patch: Partial<AnonymizedProfile["work_history"][number]>) {
    setProfile((prev) => ({
      ...prev,
      work_history: prev.work_history.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    }));
  }

  function removeWorkHistoryEntry(index: number) {
    setProfile((prev) => ({
      ...prev,
      work_history: prev.work_history.filter((_, i) => i !== index),
    }));
  }

  function exec(command: "bold" | "italic" | "underline" | "insertUnorderedList") {
    editorRef.current?.focus();
    document.execCommand(command);
  }

  function handleEditorInput() {
    setProfile((prev) => ({ ...prev, summary: editorRef.current?.innerHTML ?? "" }));
  }

  function handleSave() {
    startTransition(async () => {
      await saveAnonymizedProfile(candidateId, title, profile);
      setSavedState("saved");
      setTimeout(() => setSavedState("idle"), 2000);
    });
  }

  const chipFieldMeta = useMemo(
    () => profileBuildingBlocks.filter((block) => block.category !== undefined),
    []
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-4 rounded-lg border border-surface-border bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink">Profil-Titel (anonymisiert)</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z. B. Senior Java-Entwickler (m/w/d)"
          />
        </div>

        <Tabs defaultValue="editor">
          <TabsList>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="details">Details & Historie</TabsTrigger>
            <TabsTrigger value="vorschau">
              <Eye className="mr-1 h-3.5 w-3.5" />
              PDF-Vorschau
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="pt-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Zusammenfassung</label>
              <div className="rounded-md border border-surface-border">
                <div className="flex items-center gap-1 border-b border-surface-border bg-surface-subtle px-2 py-1.5">
                  <ToolbarButton icon={Bold} label="Fett" onClick={() => exec("bold")} />
                  <ToolbarButton icon={Italic} label="Kursiv" onClick={() => exec("italic")} />
                  <ToolbarButton icon={Underline} label="Unterstrichen" onClick={() => exec("underline")} />
                  <ToolbarButton
                    icon={List}
                    label="Liste"
                    onClick={() => exec("insertUnorderedList")}
                  />
                </div>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleEditorInput}
                  dangerouslySetInnerHTML={{ __html: profile.summary }}
                  className="min-h-[140px] px-3 py-2.5 text-sm text-ink outline-none [&_ul]:list-disc [&_ul]:pl-5"
                  data-placeholder="Kurzprofil des Kandidaten – keine Namen oder Kontaktdaten eintragen…"
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ChipEditor
                title="Qualifikationen"
                field="qualifications"
                values={profile.qualifications}
                draft={chipDraft.qualifications}
                onDraftChange={(v) => setChipDraft((p) => ({ ...p, qualifications: v }))}
                onAdd={(v) => addChip("qualifications", v)}
                onRemove={(v) => removeChip("qualifications", v)}
              />
              <ChipEditor
                title="Branchenerfahrung"
                field="industry_experience"
                values={profile.industry_experience}
                draft={chipDraft.industry_experience}
                onDraftChange={(v) => setChipDraft((p) => ({ ...p, industry_experience: v }))}
                onAdd={(v) => addChip("industry_experience", v)}
                onRemove={(v) => removeChip("industry_experience", v)}
              />
              <ChipEditor
                title="Zertifikate"
                field="certificates"
                values={profile.certificates}
                draft={chipDraft.certificates}
                onDraftChange={(v) => setChipDraft((p) => ({ ...p, certificates: v }))}
                onAdd={(v) => addChip("certificates", v)}
                onRemove={(v) => removeChip("certificates", v)}
              />
              <ChipEditor
                title="Skills"
                field="skills"
                values={profile.skills}
                draft={chipDraft.skills}
                onDraftChange={(v) => setChipDraft((p) => ({ ...p, skills: v }))}
                onAdd={(v) => addChip("skills", v)}
                onRemove={(v) => removeChip("skills", v)}
              />
            </div>
          </TabsContent>

          <TabsContent value="details" className="flex flex-col gap-3 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-ink">Berufserfahrung</h3>
              <Button variant="secondary" size="sm" onClick={addWorkHistoryEntry}>
                <Plus className="h-3.5 w-3.5" />
                Station hinzufügen
              </Button>
            </div>
            {profile.work_history.length === 0 && (
              <p className="text-sm text-ink-muted">Noch keine Stationen erfasst.</p>
            )}
            {profile.work_history.map((entry, index) => (
              <div key={index} className="rounded-md border border-surface-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Input
                    value={entry.role}
                    onChange={(e) => updateWorkHistoryEntry(index, { role: e.target.value })}
                    placeholder="Position, z. B. „Teamleiter Softwareentwicklung“"
                    className="font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => removeWorkHistoryEntry(index)}
                    className="shrink-0 rounded-md p-1.5 text-ink-muted hover:bg-surface-subtle hover:text-status-danger"
                    aria-label="Station entfernen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Input
                  value={entry.period}
                  onChange={(e) => updateWorkHistoryEntry(index, { period: e.target.value })}
                  placeholder="Zeitraum, z. B. „2019 – 2023“"
                  className="mt-2"
                />
                <textarea
                  value={entry.description}
                  onChange={(e) => updateWorkHistoryEntry(index, { description: e.target.value })}
                  placeholder="Kurzbeschreibung der Tätigkeit"
                  rows={2}
                  className="mt-2 w-full rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="vorschau" className="pt-4">
            <div className="overflow-hidden rounded-md border border-surface-border">
              <iframe src={pdfPreviewUrl} title="PDF-Vorschau" className="h-[600px] w-full" />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between border-t border-surface-border pt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-muted">Vorlage</span>
            <Select value={template} onValueChange={(v) => setTemplate(v as ProfileTemplate)}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {profileTemplates.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            {savedState === "saved" && (
              <span className="text-sm text-status-done">Gespeichert</span>
            )}
            <Button variant="secondary" asChild>
              <a href={`${pdfPreviewUrl}?download=1`} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" />
                Als PDF exportieren
              </a>
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              <Save className="h-4 w-4" />
              {isPending ? "Speichert…" : "Speichern"}
            </Button>
          </div>
        </div>
      </div>

      <aside className="flex flex-col gap-4 rounded-lg border border-surface-border bg-white p-4 shadow-panel">
        <div>
          <h3 className="text-sm font-medium text-ink">Baustein-System</h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            Klicke auf einen Baustein, um ihn zum Profil hinzuzufügen.
          </p>
        </div>
        {chipFieldMeta.map((block) => (
          <div key={block.category}>
            <p className="mb-1.5 text-xs font-medium text-ink-muted">{block.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {block.options.map((option) => {
                const active = profile[block.category].includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      active ? removeChip(block.category, option) : addChip(block.category, option)
                    }
                    className={
                      active
                        ? "rounded-full bg-brand px-2.5 py-1 text-xs font-medium text-white"
                        : "rounded-full border border-surface-border px-2.5 py-1 text-xs text-ink-muted hover:border-brand hover:text-brand"
                    }
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Bold;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-white hover:text-ink"
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}

function ChipEditor({
  title,
  values,
  draft,
  onDraftChange,
  onAdd,
  onRemove,
}: {
  title: string;
  field: ChipField;
  values: string[];
  draft: string;
  onDraftChange: (v: string) => void;
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-ink">{title}</label>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <span
            key={value}
            className="flex items-center gap-1 rounded-full bg-brand-light px-2.5 py-1 text-xs font-medium text-brand"
          >
            {value}
            <button type="button" onClick={() => onRemove(value)} aria-label={`${value} entfernen`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAdd(draft);
          onDraftChange("");
        }}
        className="flex gap-1.5"
      >
        <Input
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="Hinzufügen und Enter drücken…"
          className="h-8 text-xs"
        />
      </form>
    </div>
  );
}
