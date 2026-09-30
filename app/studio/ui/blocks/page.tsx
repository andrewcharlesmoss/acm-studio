import type { Metadata } from "next";
import { blockLibraryEntries } from "../../blocks/library-catalogue";
import { BlockLibraryNavigation } from "./block-library-navigation";
import { StudioUiLibrary } from "../studio-ui-library";
import "../catalogue-navigation.css";
import "./catalogue.css";

export const metadata: Metadata = { title: "Blocks · Studio UI Library", description: "Browse documented ACM Studio block definitions and interactive specimens." };

export default function StudioUiBlocksPage() {
  const groups = blockLibraryEntries.reduce<Map<string, typeof blockLibraryEntries>>((result, entry) => {
    const entries = result.get(entry.group) ?? [];
    result.set(entry.group, [...entries, entry]);
    return result;
  }, new Map());
  return <StudioUiLibrary section="blocks"><div className="ui-blocks-layout">
    <BlockLibraryNavigation active="all" />
    <section className="ui-blocks-main ui-page-intro" aria-labelledby="ui-blocks-title">
      <p className="rl-eyebrow">Block Library</p><h1 id="ui-blocks-title">Blocks</h1>
      <p>Explore the typed blocks and the template Content slot. Each detail page uses the production editor field, inspector and preview renderer with temporary example data.</p>
      {[...groups].map(([group, entries]) => <section className="ui-block-index-group" key={group}><h2>{group}</h2><div className="ui-block-index-grid">{entries.map((entry) => <article className="ui-catalogue-card" key={entry.type}><div><p className="rl-eyebrow">{entry.type === "template-content" ? "Template element" : entry.profile.mapping}</p><h3>{entry.label}</h3><p>{entry.description}</p></div><a href={entry.href}>Open {entry.label} <span aria-hidden="true">→</span></a></article>)}</div></section>)}
    </section>
  </div></StudioUiLibrary>;
}
