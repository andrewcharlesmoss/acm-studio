"use client";

import { useReducer, useState } from "react";
import type { ContentBlock } from "../../../content/model";
import type { StyleViewport } from "../../../content/responsive-styles";
import { BlockInspector } from "../../blocks/inspectors/block-inspector";
import { BlocksPreview } from "../../site-editor/blocks-preview";
import { createStylesPreview, resolvePreviewStyle, stylesPreviewReducer } from "../../site-editor/styles-preview-state";
import { HistoryActions } from "../../controls/history-actions";
import { StudioButton } from "../../controls/button";
import "../../site-editor/site-editor-preview.css";

const initialImage: Extract<ContentBlock, { type: "image" }> = {
  id: "image-pane-comparison",
  type: "image",
  src: "",
  mediaId: "library-local-image",
  alt: "Illustrated green hill with a blue sky",
  caption: "A local SVG fixture",
  aspectRatio: "landscape",
  scale: "cover",
  displayWidth: 640,
  displayHeight: 360,
};

export function ImagePaneComparison() {
  const [image, setImage] = useState(initialImage);
  const [styles, dispatch] = useReducer(stylesPreviewReducer, undefined, createStylesPreview);
  const [fontSizeViewModes, setFontSizeViewModes] = useState<Record<string, "presets" | "custom">>({});
  const [viewport, setViewport] = useState<StyleViewport>("desktop");
  const [variation, setVariation] = useState<string>();
  const [resetRevision, setResetRevision] = useState(0);
  const effectiveStyles = resolvePreviewStyle(styles.present, "global");

  function resetExample() {
    setImage(initialImage);
    dispatch({ type: "reset", scope: "global" });
    setFontSizeViewModes({});
    setViewport("desktop");
    setVariation(undefined);
    setResetRevision(revision => revision + 1);
  }

  return <section className="ui-image-pane-comparison" aria-labelledby="ui-image-pane-comparison-title">
    <header className="ui-image-comparison-header">
      <div>
        <p className="rl-eyebrow">Compare the two editors</p>
        <h2 id="ui-image-pane-comparison-title">Image settings and styles</h2>
        <p>These panes both edit Image blocks, but at different scopes. Changes here are temporary examples.</p>
      </div>
      <div className="ui-image-comparison-actions">
        <HistoryActions canUndo={styles.past.length > 0} canRedo={styles.future.length > 0} onUndo={() => dispatch({ type: "undo" })} onRedo={() => dispatch({ type: "redo" })} undoLabel="Undo site-wide style example" redoLabel="Redo site-wide style example" />
        <StudioButton onClick={resetExample}>Reset comparison</StudioButton>
      </div>
    </header>
    <p className="ui-image-comparison-scroll-hint" id="ui-image-comparison-scroll-hint">On narrow screens, scroll horizontally to see both panes.</p>
    <div className="ui-image-comparison-scroll" role="region" aria-label="Image pane comparison" aria-describedby="ui-image-comparison-scroll-hint" tabIndex={0}>
    <div className="ui-image-comparison-grid">
      <section className="ui-image-comparison-pane" aria-labelledby="ui-image-instance-title" data-inspector-popover-owner="">
        <header>
          <h3 id="ui-image-instance-title">This image</h3>
          <p>Edits one image’s source, alternative text, link, dimensions and advanced attributes. Edit its caption on the canvas.</p>
        </header>
        <aside className="ui-block-inspector" aria-label="Individual Image settings">
          <fieldset style={{ border: 0, margin: 0, minWidth: 0, padding: 0 }}>
            <BlockInspector
              block={image}
              onChange={next => { if (next.type === "image") setImage(next); }}
              onOpenFiles={() => setImage(current => ({ ...current, mediaId: current.mediaId === "library-local-image" ? "library-local-image-two" : "library-local-image", alt: current.mediaId === "library-local-image" ? "Illustrated flower in a warm field" : "Illustrated green hill with a blue sky" }))}
              canOpenFiles
              fontSizeModeScope="image-pane-comparison"
              fontSizeViewModes={fontSizeViewModes}
              onFontSizeViewModeChange={(key, mode) => setFontSizeViewModes(current => ({ ...current, [key]: mode }))}
            />
          </fieldset>
        </aside>
      </section>
      <section className="ui-image-comparison-pane" aria-labelledby="ui-image-global-title" data-inspector-popover-owner="">
        <header>
          <h3 id="ui-image-global-title">Site-wide image styles</h3>
          <p>Sets shared appearance defaults for images. It doesn’t edit an image’s content or media settings.</p>
        </header>
        <div className="site-editor-preview ui-image-global-style-pane">
          <BlocksPreview
            key={resetRevision}
            selected="image"
            onSelect={() => {}}
            variation={variation}
            onVariationChange={setVariation}
            viewport={viewport}
            onViewportChange={setViewport}
            selection={effectiveStyles}
            authored={styles.present.global}
            scope="global"
            dispatch={dispatch}
            onBack={() => {}}
            showBack={false}
          />
        </div>
      </section>
    </div>
    </div>
    <p className="ui-block-isolation-note">The left pane edits only this temporary image. The right pane changes only temporary global style defaults. Neither specimen saves to a site or document.</p>
  </section>;
}
