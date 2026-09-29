import { blockLibraryEntries } from "../../blocks/library-catalogue";

export function BlockLibraryNavigation({ active }: { active: "all" | string }) {
  const groups = blockLibraryEntries.reduce<Map<string, typeof blockLibraryEntries>>((result, entry) => {
    const entries = result.get(entry.group) ?? [];
    result.set(entry.group, [...entries, entry]);
    return result;
  }, new Map());

  return <aside className="ui-block-library-menu" aria-label="Block Library menu">
    <h2>Block Library</h2>
    <nav aria-label="Block Library">
      <ul className="ui-block-library-menu-list">
        <li><a href="/studio/ui/blocks" aria-current={active === "all" ? "page" : undefined}>All Blocks</a></li>
      </ul>
      {[...groups].map(([group, entries]) => <section className="ui-block-library-menu-group" key={group}>
        <h3>{group}</h3>
        <ul className="ui-block-library-menu-list">
          {entries.map((entry) => <li key={entry.type}><a href={entry.href} aria-current={active === entry.type ? "page" : undefined}>{entry.label}</a></li>)}
        </ul>
      </section>)}
    </nav>
  </aside>;
}
