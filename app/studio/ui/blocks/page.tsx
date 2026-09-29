import type { Metadata } from "next";
import { StudioUiLibrary } from "../studio-ui-library";
import "./catalogue.css";

export const metadata: Metadata = { title: "Blocks · Studio UI Library", description: "Browse documented ACM Studio block definitions and interactive specimens." };

export default function StudioUiBlocksPage() {
  return <StudioUiLibrary section="blocks"><section className="ui-page-intro" aria-labelledby="ui-blocks-title">
    <p className="rl-eyebrow">Block Library</p><h1 id="ui-blocks-title">Blocks</h1>
    <p>Each entry connects its identity, inspector capabilities, dependencies and editing example to the existing typed block model.</p>
    <article className="ui-catalogue-card"><div><p className="rl-eyebrow">First complete entry</p><h2>Paragraph</h2><p>Ordinary prose with inline formatting, Gutenberg-aligned settings and separate Studio additions.</p></div><a href="/studio/ui/blocks/paragraph">Open Paragraph entry <span aria-hidden="true">→</span></a></article>
  </section></StudioUiLibrary>;
}
