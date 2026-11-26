"use client";

import { useMemo, useState } from "react";
import {
  primaryCategoryIdForTerm,
  qualificationGroups,
  recruitingCategories,
} from "@/lib/candidate/recruiting-catalog";
import { MAX_TERMS_PER_KIND } from "@/lib/candidate/terms";
import { cn } from "@/lib/utils";

function matchesQuery(label: string, query: string) {
  if (!query) return true;
  return label.toLowerCase().includes(query);
}

function toggleValue(list: string[], value: string) {
  if (list.includes(value)) return list.filter((item) => item !== value);
  if (list.length >= MAX_TERMS_PER_KIND) return list;
  return [...list, value];
}

const categoryThemes: Record<
  string,
  { panel: string; tab: string; tabActive: string; heading: string; chip: string }
> = {
  "project-management": {
    panel: "bg-[#E7ECF8]",
    tab: "bg-[#D4DDF3] text-[#1A2F78]",
    tabActive: "bg-[#1A2F78] text-white",
    heading: "text-[#1A2F78]",
    chip: "border-[#1A2F78] bg-[#1A2F78] text-white",
  },
  engineering: {
    panel: "bg-[#E3F4EF]",
    tab: "bg-[#C8E8DE] text-[#0F5F52]",
    tabActive: "bg-[#0F5F52] text-white",
    heading: "text-[#0F5F52]",
    chip: "border-[#0F5F52] bg-[#0F5F52] text-white",
  },
  "construction-management": {
    panel: "bg-[#F8EFE3]",
    tab: "bg-[#F0DCC4] text-[#8A4B12]",
    tabActive: "bg-[#B86A1A] text-white",
    heading: "text-[#8A4B12]",
    chip: "border-[#B86A1A] bg-[#B86A1A] text-white",
  },
  "quality-management": {
    panel: "bg-[#EAF5E6]",
    tab: "bg-[#D3EBCB] text-[#2F6B22]",
    tabActive: "bg-[#2F6B22] text-white",
    heading: "text-[#2F6B22]",
    chip: "border-[#2F6B22] bg-[#2F6B22] text-white",
  },
  "hse-management": {
    panel: "bg-[#FDECE6]",
    tab: "bg-[#F8D4C8] text-[#9B3419]",
    tabActive: "bg-[#C94B24] text-white",
    heading: "text-[#9B3419]",
    chip: "border-[#C94B24] bg-[#C94B24] text-white",
  },
  commissioning: {
    panel: "bg-[#EEE8F8]",
    tab: "bg-[#DDD4F0] text-[#4A2F86]",
    tabActive: "bg-[#4A2F86] text-white",
    heading: "text-[#4A2F86]",
    chip: "border-[#4A2F86] bg-[#4A2F86] text-white",
  },
};

const fallbackTheme = categoryThemes["project-management"];

function themeFor(id: string) {
  return categoryThemes[id] ?? fallbackTheme;
}

function Chip({
  label,
  selected,
  disabled,
  onToggle,
  selectedClass,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  selectedClass?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "rounded-full border px-3 py-1.5 text-left text-[13px] leading-5 transition-colors",
        selected
          ? (selectedClass ?? "border-[#141C6B] bg-[#141C6B] text-white")
          : "border-black/10 bg-white/80 text-ink hover:bg-white",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      {label}
    </button>
  );
}

export function KeywordCatalogPicker({
  selected,
  onChange,
  disabled,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const [activeId, setActiveId] = useState(recruitingCategories[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const category = recruitingCategories.find((item) => item.id === activeId) ?? recruitingCategories[0];
  const q = query.trim().toLowerCase();
  const positions = useMemo(
    () => (category ? category.positions.filter((item) => matchesQuery(item, q)) : []),
    [category, q]
  );
  const disciplines = useMemo(
    () => (category ? category.disciplines.filter((item) => matchesQuery(item, q)) : []),
    [category, q]
  );

  if (!category) return null;
  const theme = themeFor(category.id);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-ink">Suchbegriffe / Keywords</p>
        <p className="mt-1 text-xs leading-5 text-ink-muted">
          Oberbegriff wählen, darunter Positionen und danach Fachbereiche / Gewerke anklicken.
        </p>
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {recruitingCategories.map((item) => {
          const active = item.id === category.id;
          const itemTheme = themeFor(item.id);
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => setActiveId(item.id)}
              className={cn(
                "shrink-0 rounded-md px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors",
                active ? itemTheme.tabActive : itemTheme.tab
              )}
            >
              {item.code}
              <span className="mt-0.5 block max-w-[11rem] truncate text-[11px] font-medium normal-case tracking-normal">
                {item.title}
              </span>
            </button>
          );
        })}
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((item) => (
            <Chip
              key={item}
              label={item}
              selected
              selectedClass={themeFor(primaryCategoryIdForTerm(item) ?? category.id).chip}
              disabled={Boolean(disabled)}
              onToggle={() => onChange(selected.filter((value) => value !== item))}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-ink-muted">Noch keine Keywords ausgewählt.</p>
      )}

      <div className={cn("flex flex-col gap-4 rounded-xl p-4 sm:p-5", theme.panel)}>
        <input
          type="search"
          value={query}
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Position oder Gewerk suchen"
          className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-surface-subtle"
        />

        <section>
          <h3 className={cn("text-[11px] font-medium uppercase tracking-[0.16em]", theme.heading)}>
            Positionen
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {positions.map((item) => (
              <Chip
                key={item}
                label={item}
                selected={selected.includes(item)}
                selectedClass={theme.chip}
                disabled={Boolean(disabled)}
                onToggle={() => onChange(toggleValue(selected, item))}
              />
            ))}
          </div>
        </section>

        <section>
          <h3 className={cn("text-[11px] font-medium uppercase tracking-[0.16em]", theme.heading)}>
            Fachbereiche / Gewerke
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {disciplines.map((item) => (
              <Chip
                key={item}
                label={item}
                selected={selected.includes(item)}
                selectedClass={theme.chip}
                disabled={Boolean(disabled)}
                onToggle={() => onChange(toggleValue(selected, item))}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function QualificationCatalogPicker({
  selected,
  onChange,
  disabled,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const [activeId, setActiveId] = useState(qualificationGroups[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const group = qualificationGroups.find((item) => item.id === activeId) ?? qualificationGroups[0];
  const q = query.trim().toLowerCase();
  const items = useMemo(
    () => (group ? group.items.filter((item) => matchesQuery(item, q)) : []),
    [group, q]
  );

  if (!group) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-ink">Qualifikationen / Zertifikate</p>
        <p className="mt-1 text-xs leading-5 text-ink-muted">
          Gruppe wählen und Zertifikate anklicken — zusätzlich zur hochgeladenen Datei.
        </p>
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {qualificationGroups.map((item) => {
          const active = item.id === group.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => setActiveId(item.id)}
              className={cn(
                "shrink-0 rounded-md px-3 py-2 text-[12px] font-medium transition-colors",
                active ? "bg-[#141C6B] text-white" : "bg-[#F4F5FB] text-[#141C6B] hover:bg-[#E8EAF5]"
              )}
            >
              {item.title}
            </button>
          );
        })}
      </div>

      <input
        type="search"
        value={query}
        disabled={disabled}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Zertifikat suchen"
        className="rounded-md border border-surface-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-surface-subtle"
      />

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((item) => (
            <Chip
              key={item}
              label={item}
              selected
              disabled={Boolean(disabled)}
              onToggle={() => onChange(selected.filter((value) => value !== item))}
            />
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Chip
            key={item}
            label={item}
            selected={selected.includes(item)}
            disabled={Boolean(disabled)}
            onToggle={() => onChange(toggleValue(selected, item))}
          />
        ))}
      </div>
    </div>
  );
}
