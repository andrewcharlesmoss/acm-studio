"use client";

import { useEffect, useReducer, useRef, useState, type CSSProperties } from "react";
import { BlockRenderer } from "../../components/content";
import { AcmIcon } from "@acm/icons/react";
import { Pane } from "../panes/pane-components";
import { SelectControl } from "../controls/native-fields";
import { StudioIcon } from "../studio-icons";
import { StudioAppHeader } from "../studio-app-header";
import { NumberUnitField } from "../controls/number-unit-field";
import { HistoryActions } from "../controls/history-actions";
import { handleStudioHistoryShortcut } from "../studio-history-shortcuts.mjs";
import { createSiteEditorPreview, resolveParagraphSize, siteEditorPreviewReducer, type PreviewScope } from "./preview-state";
import "./site-editor-preview.css";

const scopes = [{ id: "global", name: "Global Defaults" }, { id: "test", name: "Test" }, { id: "test2", name: "Test 2" }] as const;
export function SiteEditorPreview() {
  const [navigationWidth, setNavigationWidth] = useState(240);
  const [settingsWidth, setSettingsWidth] = useState(280);
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  const [settingsCollapsed, setSettingsCollapsed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [scope, setScope] = useState<PreviewScope>("global");
  const [history, dispatch] = useReducer(siteEditorPreviewReducer, undefined, createSiteEditorPreview);
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => {
    const root = rootRef.current;
    const listener = (event: KeyboardEvent) => handleStudioHistoryShortcut(event, navigator.platform, () => { setDraft(null); dispatch({ type: "undo" }); }, () => { setDraft(null); dispatch({ type: "redo" }); });
    root?.addEventListener("keydown", listener);
    return () => root?.removeEventListener("keydown", listener);
  }, []);
  const value = resolveParagraphSize(history.present, scope);
  const inherited = scope !== "global" && history.present[scope] === undefined;
  const name = scopes.find(item => item.id === scope)!.name;
  const invalid = draft !== null && (draft.trim() === "" || !Number.isFinite(Number(draft)) || Number(draft) < 8 || Number(draft) > 96);
  function travel(type: "undo" | "redo") { setDraft(null); dispatch({ type }); }
  return <div className="site-editor-preview" ref={rootRef}>
    <StudioAppHeader section="Site Editor"><span className="prototype-pill">Preview</span><a href="/studio">Back to Studio</a></StudioAppHeader>
    <div className="studio-notice" role="note"><strong>Preview only.</strong> Changes last until you leave or reload this page. Existing sites, content, templates, and saved styles are unaffected.</div>
    <main className="site-editor-preview-layout" style={{ "--site-navigation-width": navigationCollapsed ? "26px" : `${navigationWidth}px`, "--site-settings-width": settingsCollapsed ? "26px" : `${settingsWidth}px` } as CSSProperties}>
      <Pane label="Site Editor Navigation" side="left" width={navigationWidth} minWidth={220} maxWidth={360} onWidthChange={setNavigationWidth} collapsed={navigationCollapsed} onCollapsedChange={setNavigationCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />} style={{ width: "100%" }} header={<h2>Design</h2>}>
        <label className="site-editor-preview-scope"><span>Design Scope</span><SelectControl value={scope} onChange={event => { setDraft(null); setScope(event.currentTarget.value as PreviewScope); }}>{scopes.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</SelectControl></label>
        <p>Explore the appearance of {scope === "global" ? "all sites" : name}.</p>
        <nav className="library-tools" aria-label="Site design sections">
          {([
            { label: "Identity", icon: "account.record", siteOnly: true },
            { label: "Styles", icon: "view.styles", siteOnly: false },
            { label: "Pages", icon: "view.pages", siteOnly: true },
            { label: "Navigation", icon: "navigation.menu", siteOnly: true },
            { label: "Patterns", icon: "component.block", siteOnly: false },
            { label: "Templates", icon: "document.from-template", siteOnly: false },
          ] as const).map(item => <button type="button" key={item.label} className={`library-tool-button${item.label === "Styles" ? " is-active" : ""}`} aria-current={item.label === "Styles" ? "page" : undefined} disabled={item.label !== "Styles"}>
            <span><AcmIcon name={item.icon} scale="Regular-M" size={24} /></span><strong>{item.label}</strong><small>{item.label === "Styles" ? "Paragraph defaults" : scope === "global" && item.siteOnly ? "Select a site · Coming Soon" : "Coming Soon"}</small>
          </button>)}
        </nav>
      </Pane>
      <Pane label="Site Editor Styles" side="left" width={settingsWidth} minWidth={240} maxWidth={420} onWidthChange={setSettingsWidth} collapsed={settingsCollapsed} onCollapsedChange={setSettingsCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />} style={{ width: "100%" }} header={<h2>Styles</h2>}>
        <div className="site-editor-preview-settings"><h2>Paragraph Defaults</h2><p>Editing: <strong>{name}</strong></p><label htmlFor="site-editor-font-size">Font Size</label><NumberUnitField inputProps={{ id: "site-editor-font-size", value: draft ?? value, min: 8, max: 96, step: 1, "aria-invalid": invalid, "aria-describedby": "site-editor-size-help", onChange: event => { const text = event.currentTarget.value; setDraft(text); if (text.trim() !== "" && Number.isFinite(Number(text))) dispatch({ type: "change", scope, value: Number(text) }); }, onBlur: () => setDraft(null) }} units={["px"]} unitProps={{ value: "px", disabled: true, "aria-label": "Font size unit" }} /><p id="site-editor-size-help">Use 8–96px. {scope === "global" ? "Sites inherit this value unless they override it." : "Changing this value creates a site override."}</p>
        {invalid ? <p role="alert">Enter a size between 8 and 96px.</p> : null}
        {scope !== "global" ? <button type="button" disabled={inherited} onClick={() => { setDraft(null); dispatch({ type: "change", scope, value: undefined }); }}>Reset to Inherited</button> : null}
      </div>
      </Pane>
      <section className="site-editor-preview-book" aria-labelledby="site-editor-preview-title"><header><div><p>Style Book Preview</p><h1 id="site-editor-preview-title">{name}</h1></div><div className="site-editor-preview-history"><HistoryActions canUndo={history.past.length > 0} canRedo={history.future.length > 0} onUndo={() => travel("undo")} onRedo={() => travel("redo")} /></div></header>
        <h2>Paragraph</h2><div className="site-editor-preview-paper"><BlockRenderer variant="studio" blocks={[{ id: "site-editor-paragraph", type: "paragraph", text: "A shared starting point for every site. Each site can follow the global defaults or choose its own paragraph size.", style: { fontSizeCustom: `${value}px` } }]} /></div>
        <p className="site-editor-preview-origin" role="status">{value}px · {scope === "global" ? "Global default" : inherited ? "Inherited from Global Defaults" : "Site override"}</p>
        <section className="site-editor-preview-summary" aria-label="Effective paragraph sizes"><h2>Across Your Sites</h2>{scopes.map(item => <p key={item.id}><strong>{item.name}</strong><span>{resolveParagraphSize(history.present, item.id)}px · {item.id === "global" ? "Default" : history.present[item.id] === undefined ? "Inherited" : "Overridden"}</span></p>)}</section>
      </section>

    </main>
  </div>;
}
