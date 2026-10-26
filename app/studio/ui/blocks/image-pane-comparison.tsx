"use client";

import { useReducer, useState, type ReactNode } from "react";
import type { StyleViewport } from "../../../content/responsive-styles";
import { HistoryActions } from "../../controls/history-actions";
import { StudioButton } from "../../controls/button";
import { BlocksPreview } from "../../site-editor/blocks-preview";
import { createStylesPreview, resolvePreviewStyle, stylesPreviewReducer } from "../../site-editor/styles-preview-state";
import { handleStudioHistoryShortcut } from "../../studio-history-shortcuts.mjs";
import "../../site-editor/site-editor-preview.css";

export function ImageComparisonLayout({ enabled, resetRevision, children }: { enabled: boolean; resetRevision: number; children: ReactNode }) {
  if (!enabled) return children;
  return <section className="ui-image-pane-comparison" aria-labelledby="ui-image-pane-comparison-title">
    <h2 id="ui-image-pane-comparison-title">Compare image settings and styles</h2>
    <p>Compare this image’s settings with site-wide image styles. Both examples are temporary.</p>
    <p id="ui-image-comparison-scroll-hint">On narrow screens, scroll horizontally to see both panes.</p>
    <div className="ui-image-comparison-scroll" role="region" aria-label="Image pane comparison" aria-describedby="ui-image-comparison-scroll-hint" tabIndex={0}>
      <div className="ui-image-comparison-grid">
        {children}
        <ImagePaneComparison key={resetRevision} />
      </div>
    </div>
  </section>;
}

export function ImagePaneComparison() {
  const [styles, dispatch] = useReducer(stylesPreviewReducer, undefined, createStylesPreview);
  const [viewport, setViewport] = useState<StyleViewport>("desktop");
  const [variation, setVariation] = useState<string>();
  const [resetRevision, setResetRevision] = useState(0);

  function resetStyles() {
    dispatch({ type: "reset", scope: "global" });
    setViewport("desktop");
    setVariation(undefined);
    setResetRevision(revision => revision + 1);
  }

  return <section className="ui-image-comparison-site-pane" aria-labelledby="ui-image-global-title" data-inspector-popover-owner="" onKeyDown={event => handleStudioHistoryShortcut(event.nativeEvent, navigator.platform, () => dispatch({ type: "undo" }), () => dispatch({ type: "redo" }))}>
    <header className="ui-image-comparison-site-header">
      <div><h2 id="ui-image-global-title">Site-wide image styles</h2><p>Temporary appearance defaults for images across the site.</p></div>
      <div className="ui-image-comparison-actions">
        <HistoryActions canUndo={styles.past.length > 0} canRedo={styles.future.length > 0} onUndo={() => dispatch({ type: "undo" })} onRedo={() => dispatch({ type: "redo" })} undoLabel="Undo site-wide style example" redoLabel="Redo site-wide style example" />
        <StudioButton onClick={resetStyles}>Reset styles</StudioButton>
      </div>
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
        selection={resolvePreviewStyle(styles.present, "global")}
        authored={styles.present.global}
        scope="global"
        dispatch={dispatch}
        onBack={() => {}}
        showBack={Boolean(variation)}
      />
    </div>
  </section>;
}
