"use client";

import { useMemo, useState } from "react";
import {
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

const tabThemes: Record<string, { tab: string; tabActive: string }> = {
  "project-management": {
    tab: "bg-[#D4DDF3] text-[#1A2F78]",
    tabActive: "bg-[#1A2F78] text-white",
  },
  engineering: {
    tab: "bg-[#C8E8DE] text-[#0F5F52]",
    tabActive: "bg-[#0F5F52] text-white",
  },
  "construction-management": {
    tab: "bg-[#F0DCC4] text-[#8A4B12]",
    tabActive: "bg-[#B86A1A] text-white",
  },
  "quality-management": {
    tab: "bg-[#D3EBCB] text-[#2F6B22]",
    tabActive: "bg-[#2F6B22] text-white",
  },
  "hse-management": {
    tab: "bg-[#F8D4C8] text-[#9B3419]",
    tabActive: "bg-[#C94B24] text-white",
  },
  commissioning: {
    tab: "bg-[#DDD4F0] text-[#4A2F86]",
    tabActive: "bg-[#4A2F86] text-white",
  },
};

function Chip({
  label,
  selected,
  disabled,
  onToggle,
  onDark,
  onOrange,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  onDark?: boolean;
  onOrange?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "rounded-full border px-3 py-1.5 text-left text-[13px] leading-5 transition-colors",
        onOrange
          ? selected
            ? "border-white bg-white text-brand"
            : "border-white/25 bg-white/15 text-white hover:border-white/50 hover:bg-white/25"
          : onDark
            ? selected
              ? "border-white bg-white text-[#141C6B]"
              : "border-white/20 bg-[#1C2A8A] text-white hover:border-white/45 hover:bg-[#2436A0]"
            : selected
              ? "border-[#141C6B] bg-[#141C6B] text-white"
              : "border-[#D8DCE8] bg-white text-ink hover:border-[#141C6B]/40",
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
          const itemTheme = tabThemes[item.id] ?? tabThemes["project-management"];
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
              disabled={Boolean(disabled)}
              onToggle={() => onChange(selected.filter((value) => value !== item))}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-ink-muted">Noch keine Keywords ausgewählt.</p>
      )}

      <div className="flex flex-col gap-4 rounded-xl bg-[#141C6B] p-4 sm:p-5">
        <input
          type="search"
          value={query}
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Position oder Gewerk suchen"
          className="rounded-md border border-white/15 bg-[#0B1038] px-3 py-2 text-sm text-white placeholder:text-white/45 focus:border-[#8B96D9] focus:outline-none focus:ring-1 focus:ring-[#8B96D9] disabled:opacity-60"
        />

        <section>
          <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8B96D9]">
            Positionen
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {positions.map((item) => (
              <Chip
                key={item}
                label={item}
                selected={selected.includes(item)}
                onDark
                disabled={Boolean(disabled)}
                onToggle={() => onChange(toggleValue(selected, item))}
              />
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8B96D9]">
            Fachbereiche / Gewerke
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {disciplines.map((item) => (
              <Chip
                key={item}
                label={item}
                selected={selected.includes(item)}
                onDark
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
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visibleGroups = useMemo(
    () =>
      qualificationGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => matchesQuery(item, q)),
        }))
        .filter((group) => group.items.length > 0),
    [q]
  );
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-ink">Qualifikationen / Zertifikate</p>
        <p className="mt-1 text-xs leading-5 text-ink-muted">
          Zertifikate in der passenden Gruppe anklicken — zusätzlich zur hochgeladenen Datei.
        </p>
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

      {visibleGroups.length > 0 ? (
        <div className="flex flex-col gap-5 rounded-xl bg-brand p-4 sm:p-5">
          {visibleGroups.map((group) => (
            <section key={group.id}>
              <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-white">
                {group.title}
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <Chip
                    key={item}
                    label={item}
                    selected={selected.includes(item)}
                    onOrange
                    disabled={Boolean(disabled)}
                    onToggle={() => onChange(toggleValue(selected, item))}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
