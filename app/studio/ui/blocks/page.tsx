import type { Metadata } from "next";
import { blockLibraryEntries } from "../../blocks/library-catalogue";
import { BlockLibraryNavigation } from "./block-library-navigation";
import { StudioUiLibrary } from "../studio-ui-library";
import "../catalogue-navigation.css";
import "./catalogue.css";

export const metadata: Metadata = { title: "Blocks · Studio UI Library", description: "Browse documented ACM Studio block definitions and interactive specimens." };

export default function StudioUiBlocksPage() {
  return <StudioUiLibrary section="blocks"><div className="ui-blocks-layout">
    <BlockLibraryNavigation active="all" />
    <section className="ui-blocks-main ui-page-intro" aria-labelledby="ui-blocks-title">
      <p className="rl-eyebrow">Block Library</p><h1 id="ui-blocks-title">Blocks</h1>
      <p>Each entry connects its identity, inspector capabilities, dependencies and editing example to the existing typed block model.</p>
      {blockLibraryEntries.map((entry) => <article className="ui-catalogue-card" key={entry.type}><div><p className="rl-eyebrow">{entry.group} block</p><h2>{entry.label}</h2><p>{entry.description}</p></div><a href={entry.href}>Open {entry.label} entry <span aria-hidden="true">→</span></a></article>)}
    </section>
  </div></StudioUiLibrary>;
}
