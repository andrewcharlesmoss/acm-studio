"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AcmIcon } from "@acm/icons/react";
import { SearchInput } from "../../controls/native-fields";
import { blockContextEntries as blockLibraryEntries } from "./block-contexts";
import { CatalogueNavigation, type CatalogueNavigationGroup } from "../catalogue-navigation.tsx";

export function BlockLibraryNavigation({ active, onSelect, intro }: { active: "all" | string; intro?: ReactNode; onSelect: (type: (typeof blockLibraryEntries)[number]["type"] | null) => void }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const groups = useMemo(() => blockLibraryEntries.reduce<Map<string, typeof blockLibraryEntries>>((result, entry) => {
    const categoryMatches = entry.group.toLowerCase().includes(normalizedQuery);
    const searchableText = `${entry.label} ${entry.type} ${entry.description}`.toLowerCase();
    if (normalizedQuery && !categoryMatches && !searchableText.includes(normalizedQuery)) return result;
    const entries = result.get(entry.group) ?? [];
    result.set(entry.group, [...entries, entry]);
    return result;
  }, new Map()), [normalizedQuery]);

  const navigationGroups: CatalogueNavigationGroup[] = [...groups].map(([group, entries]) => ({
    id: group,
    label: group,
    items: entries.map(entry => ({ id: entry.type, label: entry.label, current: active === entry.type, onSelect: () => onSelect(entry.type) })),
  }));

  const navigationIntro = <>
    {intro}
    <div className="ui-block-library-search" role="search" aria-label="Search the Block Library">
      <AcmIcon name="action.search" size={18} />
      <SearchInput aria-label="Search blocks" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search blocks…" />
      <button type="button" disabled={!query} aria-label="Clear block search" onClick={() => setQuery("")}><AcmIcon name="action.close" size={16} /></button>
    </div>
    {normalizedQuery && navigationGroups.length === 0 ? <p className="ui-block-library-search-empty" role="status">No blocks match “{query.trim()}”.</p> : null}
  </>;

  return <CatalogueNavigation title="Block Library" ariaLabel="Block Library menu" navigationLabel="Block Library" groups={navigationGroups} intro={navigationIntro}
    leadingItems={[{ id: "all", label: "All Blocks", current: active === "all", onSelect: () => onSelect(null) }]} />;
}
