import { blockLibraryEntries } from "../../blocks/library-catalogue";
import { CatalogueNavigation, type CatalogueNavigationGroup } from "../catalogue-navigation.tsx";

export function BlockLibraryNavigation({ active, onSelect }: { active: "all" | string; onSelect: (type: (typeof blockLibraryEntries)[number]["type"] | null) => void }) {
  const groups = blockLibraryEntries.reduce<Map<string, typeof blockLibraryEntries>>((result, entry) => {
    const entries = result.get(entry.group) ?? [];
    result.set(entry.group, [...entries, entry]);
    return result;
  }, new Map());

  const navigationGroups: CatalogueNavigationGroup[] = [...groups].map(([group, entries]) => ({
    id: group,
    label: group,
    items: entries.map(entry => ({ id: entry.type, label: entry.label, current: active === entry.type, onSelect: () => onSelect(entry.type) })),
  }));

  return <CatalogueNavigation title="Block Library" ariaLabel="Block Library menu" navigationLabel="Block Library" groups={navigationGroups}
    leadingItems={[{ id: "all", label: "All Blocks", current: active === "all", onSelect: () => onSelect(null) }]} />;
}
