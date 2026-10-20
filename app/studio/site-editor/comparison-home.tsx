import { applyPreviewBlockStyles } from "./blocks-preview-model";
import { BlockRenderer } from "../../components/content";
import { comparisonHomeBlocks } from "./comparison-home-model";
import { styleBookPresentation } from "./style-book-model";
import type { StyleSelection } from "./styles-preview-state";
import "./style-book.css";
import "./comparison-home.css";

export function ComparisonHome({ selection }: { selection: StyleSelection }) {
  return <article id="comparison-details" className="site-style-book site-comparison-home" style={styleBookPresentation(selection)} aria-label="Home comparison sample">
    <div className="site-style-book-sample"><BlockRenderer variant="studio" blocks={applyPreviewBlockStyles(comparisonHomeBlocks, selection.blockStyles)} /></div>
  </article>;
}
