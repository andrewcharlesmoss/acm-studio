import { blockLibraryEntries } from "../../blocks/library-catalogue";

export function BlockLibraryNavigation({ active, onSelect }: { active: "all" | string; onSelect: (type: (typeof blockLibraryEntries)[number]["type"] | null) => void }) {
  const groups = blockLibraryEntries.reduce<Map<string, typeof blockLibraryEntries>>((result, entry) => {
    const entries = result.get(entry.group) ?? [];
    result.set(entry.group, [...entries, entry]);
    return result;
  }, new Map());

  return <aside className="ui-catalogue-navigation" aria-label="Block Library menu">
    <h2>Block Library</h2>
    <nav aria-label="Block Library">
      <ul className="ui-catalogue-navigation-list">
        <li><button type="button" aria-current={active === "all" ? "location" : undefined} onClick={() => onSelect(null)}>All Blocks</button></li>
      </ul>
      <div className="ui-catalogue-navigation-groups">{[...groups].map(([group, entries]) => <section className="ui-catalogue-navigation-group" key={group}>
        <h3>{group}</h3>
        <ul className="ui-catalogue-navigation-list">
          {entries.map((entry) => <li key={entry.type}><button type="button" aria-current={active === entry.type ? "location" : undefined} onClick={() => onSelect(entry.type)}>{entry.label}</button></li>)}
        </ul>
      </section>)}</div>
    </nav>
  </aside>;
}
