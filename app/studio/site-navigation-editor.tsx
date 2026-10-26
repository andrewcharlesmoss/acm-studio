"use client";
import { localPublicationHref } from "../content/publication-address";
import { HistoryActions } from "./controls/history-actions";

import { useEffect, useLayoutEffect, useCallback, useId, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { BackAction } from "./controls/back-action";
import { StudioButton } from "./controls/button";
import { StudioIcon } from "./studio-icons";
import { TemplateSurface } from "./template-renderer";
import type { navigationVisualPresentation } from "./navigation-visual-presentation";
import { NavigationCanvasEditor, NavigationMenuList } from "./template-navigation-editor";
import { beginResizeDrag, updateResizeDrag, type ResizeDrag } from "./resize-drag";
import { clampNavigationCanvasWidth, dragNavigationCanvasWidth, navigationCanvasLeftForWidth, navigationCanvasResizeBounds, navigationCanvasWidthFromKey, type NavigationCanvasResizeEdge } from "./navigation-canvas-resize";
import { PageLinkInspector } from "./page-link-inspector";
import { Pane, PaneWorkspace } from "./panes/pane-components";
import { testDocumentHref, type SiteNavigationReference } from "./test-site/contract";
import { localFixtureName, type LocalFixtureSiteId } from "./test-site/sites";
import type { StudioDocument } from "./editor-model";
import type { TemplateStoreSession } from "./template-workspace";
import type { SiteLink } from "./template-model";

/** Site content uses the site's existing history, ownership and saving adapter. */
export function SiteNavigationEditor({ siteId, ownerName, targetControls, prepareToLeaveRef, historyChangeRef, closeTitle = "Back to Templates", presentation = "workspace", visual, onEdit, navigation, templates, documents, onSave, onClose }: {
  presentation?: "workspace" | "pane" | "visual"; visual?: ReturnType<typeof navigationVisualPresentation>; onEdit?: () => void; closeTitle?: string; siteId?: LocalFixtureSiteId; ownerName?: string; targetControls?: ReactNode; prepareToLeaveRef?: MutableRefObject<(() => Promise<boolean>) | null>; historyChangeRef?: MutableRefObject<(() => void) | null>; navigation: SiteNavigationReference; templates: TemplateStoreSession;
  documents: StudioDocument[]; onSave: () => Promise<unknown>; onClose: () => void;
}) {
  const name = ownerName ?? (siteId ? localFixtureName(siteId) : "Studio Drafts");
  const root = useRef<HTMLElement>(null);
  const canvasId = useId();
  const canvasStage = useRef<HTMLDivElement>(null);
  const canvasFrame = useRef<HTMLDivElement>(null);
  const canvasGesture = useRef<{ edge: NavigationCanvasResizeEdge; drag: ResizeDrag<number>; requested: number | null; requestedLeft: number | null; initialLeft: number; target: HTMLButtonElement; pointerId: number; moved: boolean } | null>(null);
  const [canvasAvailableWidth, setCanvasAvailableWidth] = useState(0);
  const [canvasRequestedWidth, setCanvasRequestedWidth] = useState<number | null>(null);
  const [canvasRequestedLeft, setCanvasRequestedLeft] = useState<number | null>(null);
  const [canvasResizing, setCanvasResizing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMenu, setSavedMenu] = useState<string | null>(null);
  const [detailsWidth, setDetailsWidth] = useState(300);
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  const rejectedField = useRef(false);
  const ownedChanges = useRef(false);
  const set = templates.store.sets.find(item => item.id === navigation.setId);
  const links = set?.navigation ?? [];
  const canvasBounds = navigationCanvasResizeBounds(canvasAvailableWidth);
  const canvasWidth = clampNavigationCanvasWidth(canvasRequestedWidth ?? canvasBounds.max, canvasBounds);
  const canvasCenteredLeft = (canvasAvailableWidth - canvasWidth) / 2;
  const canvasActualLeft = canvasRequestedLeft === null ? canvasCenteredLeft : Math.max(24, Math.min(canvasAvailableWidth - canvasWidth - 24, canvasRequestedLeft));
  const menuRevision = JSON.stringify(links);
  const committedMenu = useRef(menuRevision);
  useEffect(() => { committedMenu.current = menuRevision; }, [menuRevision]);
  const confirmedSaved = savedMenu === menuRevision && !templates.error && !["Unsaved changes", "Saving…"].includes(templates.saveLabel);
  const writable = templates.writable && Boolean(set) && !saving;
  const settleFields = useCallback(() => {
    if (document.querySelector("dialog[open], [role='dialog'], [role='menu']")) { setError("Apply or close the open menu before leaving or saving navigation."); return false; }
    // Inline fields commit on blur; link popovers retain their explicit Apply.
    const field = document.activeElement;
    if ((field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) && field.closest(".site-navigation-details")) flushSync(() => field.blur());
    return !rejectedField.current && !document.querySelector(".site-navigation-details [role='alert']");
  }, []);
  const save = useCallback(async () => {
    if (!settleFields()) return false;
    if (!writable) { setError("Saving is unavailable. Your menu draft remains here."); return false; }
    const savingMenu = committedMenu.current;
    setSavedMenu(null);
    setSaving(true);
    try { await onSave(); setError(null); setSavedMenu(savingMenu); ownedChanges.current = false; return true; }
    catch (failure) { setError(failure instanceof Error ? failure.message : "The menu could not be saved. Your draft is preserved."); return false; }
    finally { setSaving(false); }
  }, [writable, onSave, settleFields]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.shiftKey || document.querySelector("dialog[open]")) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void save(); }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [save]);
  useLayoutEffect(() => {
    if (!historyChangeRef) return;
    const mark = () => { ownedChanges.current = true; };
    historyChangeRef.current = mark;
    return () => { if (historyChangeRef.current === mark) historyChangeRef.current = null; };
  }, [historyChangeRef]);
  useLayoutEffect(() => {
    if (!prepareToLeaveRef) return;
    const prepare = () => {
      if (!settleFields()) return Promise.resolve(false);
      return (!templates.writable || !set) && !ownedChanges.current ? Promise.resolve(true) : save();
    };
    prepareToLeaveRef.current = prepare;
    return () => { if (prepareToLeaveRef.current === prepare) prepareToLeaveRef.current = null; };
  }, [prepareToLeaveRef, templates.writable, templates.error, set, save, settleFields]);
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing || document.querySelector("dialog[open], [role='dialog'], [role='menu']")) return;
      event.preventDefault();
      if (presentation === "pane" && selectedId) {
        if (settleFields()) {
          const previous = selectedId; setSelectedId(null);
          requestAnimationFrame(() => Array.from(root.current?.querySelectorAll<HTMLButtonElement>("[data-navigation-link-id]") ?? []).find(button => button.dataset.navigationLinkId === previous)?.focus());
        }
      } else onClose();
    };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, [onClose, presentation, selectedId, settleFields]);
  function changeLinks(next: SiteLink[]) {
    setSavedMenu(null);
    if (!writable) { rejectedField.current = true; return false; }
    try {
      const accepted = templates.commit(store => {
        const current = store.sets.find(item => item.id === navigation.setId);
        if (!current || JSON.stringify(current.navigation) !== JSON.stringify(links)) throw new Error("The menu changed. Reopen the action to edit its latest version.");
        return { ...store, sets: store.sets.map(item => item.id === current.id ? { ...item, navigation: next } : item) };
      });
      setError(accepted ? null : "Editing is unavailable. Your current menu has been preserved.");
      rejectedField.current = !accepted;
      if (accepted) { committedMenu.current = JSON.stringify(next); ownedChanges.current = true; }
      return accepted;
    } catch (failure) { rejectedField.current = true; setError(failure instanceof Error ? failure.message : "The menu could not be changed."); return false; }
  }
  function selectLink(id: string | null) {
    if (presentation === "pane" && selectedId && !id && !settleFields()) return;
    const previous = selectedId;
    setSelectedId(id);
    if (presentation === "pane" && !id && previous) requestAnimationFrame(() => {
      Array.from(root.current?.querySelectorAll<HTMLButtonElement>("[data-navigation-link-id]") ?? []).find(button => button.dataset.navigationLinkId === previous)?.focus();
    });
  }
  const props = { links, selectedId, writable, suggestions: documents.map(document => ({ id: document.id, title: document.title, href: siteId ? testDocumentHref(document.id) : localPublicationHref({ ...document, slug: document.publishedSlug ?? document.slug }) })), onSelect: selectLink, onChange: changeLinks };
  const details = <PageLinkInspector key={selectedId} {...props} siteId={siteId} contentOnly />;
  const notices = <>
    {!set ? <p role="status">{templates.error ?? `Loading ${name} navigation…`}</p> : null}
    {templates.syncConflict ? <div role="alert"><p>Another tab changed this menu. Choose which links to keep before leaving.</p><button type="button" onClick={() => void templates.resolveSyncConflict("theirs")}>Use Other Change</button><button type="button" onClick={() => void templates.resolveSyncConflict("mine")}>Use My Change</button></div> : null}
    {error || templates.error ? <p role="alert">{error ?? templates.error} <button type="button" onClick={templates.retryConnection}>Reconnect</button></p> : null}
  </>;
  const actions = <div className="site-navigation-actions"><HistoryActions presentation={presentation === "pane" ? "compact" : "labelled"} canUndo={templates.canUndo} canRedo={templates.canRedo} disabled={saving} onUndo={() => { ownedChanges.current = true; templates.undo(); }} onRedo={() => { ownedChanges.current = true; templates.redo(); }} /><span role="status">{saving ? "Saving navigation…" : confirmedSaved ? "Navigation saved locally" : templates.saveLabel}</span><StudioButton disabled={!writable} title="Save (⌘S / Ctrl+S)" onClick={() => void save()}>{saving ? "Saving…" : confirmedSaved ? "Saved" : "Save"}</StudioButton></div>;
  const trackInput = () => { ownedChanges.current = true; setSavedMenu(null); rejectedField.current = false; };
  useLayoutEffect(() => {
    if (presentation !== "visual") return;
    const element = canvasStage.current;
    if (!element) return;
    const measure = () => setCanvasAvailableWidth(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [presentation]);
  function cancelCanvasResize() {
    const active = canvasGesture.current;
    canvasGesture.current = null;
    if (active) {
      const bounds = navigationCanvasResizeBounds(canvasStage.current?.clientWidth ?? canvasAvailableWidth);
      const width = clampNavigationCanvasWidth(active.requested ?? bounds.max, bounds);
      const left = active.requestedLeft === null ? (canvasStage.current?.clientWidth ?? canvasAvailableWidth) / 2 - width / 2 : active.requestedLeft;
      applyCanvasResize(width, left);
      setCanvasRequestedWidth(active.requested);
      setCanvasRequestedLeft(active.requestedLeft);
      if (active.target.hasPointerCapture(active.pointerId)) active.target.releasePointerCapture(active.pointerId);
    }
    setCanvasResizing(false);
  }
  function finishInterruptedCanvasResize() {
    const active = canvasGesture.current;
    canvasGesture.current = null;
    if (active && (active.moved || active.drag.latest !== active.drag.basis)) {
      setCanvasRequestedWidth(active.drag.latest);
      setCanvasRequestedLeft(navigationCanvasLeftForWidth(active.initialLeft, active.drag.basis, active.drag.latest, active.edge));
    }
    setCanvasResizing(false);
  }
  function applyCanvasResize(width: number, left: number) {
    // Keep pointer movement out of React state so the navigation editor cannot lag the captured handle.
    const stage = canvasStage.current;
    const frame = canvasFrame.current;
    if (!stage || !frame) return;
    const boundedLeft = Math.max(24, Math.min(stage.clientWidth - width - 24, left));
    frame.style.width = `${width}px`;
    frame.style.left = `${boundedLeft - (stage.clientWidth - width) / 2}px`;
    for (const handle of frame.querySelectorAll<HTMLButtonElement>(".site-navigation-canvas-resize-handle")) {
      handle.setAttribute("aria-valuenow", String(width));
      handle.setAttribute("aria-valuetext", `${width} pixels`);
    }
  }
  function resizeHandle(edge: NavigationCanvasResizeEdge) {
    const label = edge === "left" ? "left" : "right";
    const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0 || canvasGesture.current) return;
      event.preventDefault();
      event.currentTarget.focus();
      const frame = canvasFrame.current;
      const stage = canvasStage.current;
      if (!frame || !stage) return;
      const initialLeft = frame.getBoundingClientRect().left - stage.getBoundingClientRect().left;
      canvasGesture.current = { edge, drag: beginResizeDrag(canvasWidth, { x: event.clientX, y: 0 }, false), requested: canvasRequestedWidth, requestedLeft: canvasRequestedLeft, initialLeft, target: event.currentTarget, pointerId: event.pointerId, moved: false };
      event.currentTarget.setPointerCapture(event.pointerId);
      setCanvasResizing(true);
    };
    const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
      const active = canvasGesture.current;
      if (!active || active.pointerId !== event.pointerId) return;
      if (Math.abs(event.clientX - active.drag.origin.x) > 3) active.moved = true;
      if (event.clientX === active.drag.origin.x && active.drag.latest === active.drag.basis) return;
      const width = updateResizeDrag(active.drag, { x: event.clientX, y: 0 }, false,
        (basis, delta) => dragNavigationCanvasWidth(basis, delta, active.edge, canvasBounds));
      applyCanvasResize(width, navigationCanvasLeftForWidth(active.initialLeft, active.drag.basis, width, active.edge));
    };
    const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
      const active = canvasGesture.current;
      if (!active || active.pointerId !== event.pointerId) return;
      const width = updateResizeDrag(active.drag, { x: event.clientX, y: 0 }, false,
        (basis, delta) => dragNavigationCanvasWidth(basis, delta, active.edge, canvasBounds));
      const left = navigationCanvasLeftForWidth(active.initialLeft, active.drag.basis, width, active.edge);
      applyCanvasResize(width, left);
      if (width !== active.drag.basis) {
        setCanvasRequestedWidth(width);
        setCanvasRequestedLeft(left);
      }
      canvasGesture.current = null;
      setCanvasResizing(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    };
    // eslint-disable-next-line jsx-a11y/no-interactive-element-to-noninteractive-role -- Focusable value-bearing separator follows the ARIA window-splitter pattern.
    return <button type="button" role="separator" aria-orientation="vertical" aria-label={`Resize navigation canvas from ${label} edge`}
      aria-controls={canvasId} aria-valuemin={canvasBounds.min} aria-valuemax={canvasBounds.max} aria-valuenow={canvasWidth}
      aria-valuetext={`${canvasWidth} pixels`} aria-describedby={`${canvasId}-help`} title="Drag to resize"
      className={`site-navigation-canvas-resize-handle is-${edge}`}
      onDoubleClick={() => { if (!canvasGesture.current) { setCanvasRequestedWidth(null); setCanvasRequestedLeft(null); } }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      onPointerCancel={event => { if (canvasGesture.current?.pointerId === event.pointerId) cancelCanvasResize(); }}
      onLostPointerCapture={event => { if (canvasGesture.current?.pointerId === event.pointerId) finishInterruptedCanvasResize(); }}
      onBlur={cancelCanvasResize}
      onKeyDown={event => {
        if (event.key === "Escape" && canvasGesture.current) { event.preventDefault(); event.stopPropagation(); cancelCanvasResize(); return; }
        const next = navigationCanvasWidthFromKey(canvasWidth, event.key, event.shiftKey, edge, canvasBounds);
        if (next === null) return;
        event.preventDefault();
        if (event.key === "End" || event.key === "Enter") { setCanvasRequestedWidth(null); setCanvasRequestedLeft(null); }
        else {
          setCanvasRequestedWidth(next);
          setCanvasRequestedLeft(navigationCanvasLeftForWidth(canvasActualLeft, canvasWidth, next, edge));
        }
      }} />;
  }
  if (presentation === "pane") return <section ref={root} className="site-navigation-pane" aria-label={`${name} navigation menu`}>
    <header><BackAction label="Back to navigation menus" disabled={saving} onClick={onClose} /><h3>Navigation</h3><StudioButton disabled={!set || saving} onClick={onEdit} aria-label="Edit navigation visually"><StudioIcon name="pencil" size={18} />Edit</StudioButton></header>
    <p>Navigation menus help visitors get around your website.</p>
    {actions}{notices}
    <div className="site-navigation-pane-frame" onChangeCapture={trackInput}>
      {selectedId ? <div className="site-navigation-details">{details}</div> : <NavigationMenuList {...props} />}
    </div>
  </section>;
  return <section ref={root} className={`site-navigation-workspace${presentation === "visual" ? " is-visual" : ""}`} aria-label={`${name} navigation editor`}>
    <header><div><h1>{name} navigation</h1><p>Menu items belong to {name}. Colours and alignment come from the global Header template.</p>{targetControls}</div><button type="button" disabled={saving} aria-label="Close navigation editor" title={closeTitle} onClick={onClose}><StudioIcon name="close" size={20} /></button></header>
    {actions}{notices}
    <div className="site-navigation-pane-frame" onChangeCapture={trackInput}>
      <PaneWorkspace className="site-navigation-columns" centreClassName="site-navigation-menu" label="Site navigation workspace"
        right={<Pane label="Navigation link details" side="right" width={detailsWidth} onWidthChange={setDetailsWidth} minWidth={270} maxWidth={480}
          collapsed={detailsCollapsed} onCollapsedChange={setDetailsCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />}
          className="site-navigation-details" bodyClassName="site-navigation-details-body">
          {selectedId ? details : <p>Drag a handle or use the arrows to reorder links. Select a link to edit it, or use its options menu to delete it.</p>}
        </Pane>}>
        {presentation === "visual" ? <div className="site-navigation-visual-canvas" data-inspector-popover-owner>
          <h2>Navigation menu</h2><p>Select a link to edit its text, destination or formatting.</p>
          <div ref={canvasStage} className="site-navigation-canvas-stage" data-resizing={canvasResizing || undefined}>
            {visual || set ? <div ref={canvasFrame} id={canvasId} className="site-navigation-canvas-frame" style={{ width: canvasAvailableWidth ? canvasWidth : "calc(100% - 48px)", left: canvasRequestedLeft === null ? undefined : canvasActualLeft - canvasCenteredLeft }}>
              {visual ? <TemplateSurface set={visual.set} editing editorCanvas><NavigationCanvasEditor node={visual.node} {...props} /></TemplateSurface> : set ? <><p role="note">The Header has no Navigation element. These menu links remain available for a Header that uses Navigation.</p><TemplateSurface set={set} editing editorCanvas><NavigationCanvasEditor node={{ id: "site-menu-visual", type: "element", element: "navigation" }} {...props} /></TemplateSurface></> : null}
              {resizeHandle("left")}{resizeHandle("right")}
            </div> : null}
            <span id={`${canvasId}-help`} hidden>Drag either handle to resize. Arrow keys resize; hold Shift for larger steps. Home sets the minimum; End, Enter or double-click fits the available space.</span>
          </div>
        </div> : <div data-inspector-popover-owner><h2>Menu items</h2><NavigationMenuList {...props} /></div>}
      </PaneWorkspace>
    </div>
  </section>;
}
