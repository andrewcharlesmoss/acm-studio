"use client";
import { useEffect, useRef, useState } from "react";
import { useStudioWorkspace } from "./use-studio-workspace";
import { useTemplates } from "./use-templates";
import { useStudioHistoryShortcuts } from "./use-studio-history-shortcuts";
import { TemplateEditor } from "./template-editor";
import { MediaManager } from "./media-manager";
import { StudioIcon } from "./studio-icons";
import { SiteNavigation } from "./site-navigation";
import { AcmIcon } from "@acm/icons/react";
import { createTemplateSet, copyTemplateData, templateId, templateMediaIds, visitTemplateNodes, TEMPLATE_STORAGE_KEY, type TemplateSet, type PageTemplate, type TemplatePart } from "./template-model";
import { exportTemplatePackage, importTemplatePackage, TEMPLATE_PACKAGE_LIMIT, validateTemplatePackage } from "./template-package";
import { contentMediaIds, useTemplateMedia } from "./use-template-media";
import type { MediaAsset } from "./media-store";
import { studioWriteOwnership } from "./write-ownership";
import { studioConflictDetails } from "./studio-sync-description";
import { StudioListContextMenu, type StudioListContextMenuTarget } from "./studio-list-context-menu";

type NameDialog = { title: string; name: string; confirm: (name: string) => boolean | void };
export type TemplateWorkspaceSession = ReturnType<typeof useStudioWorkspace>;
export type TemplateStoreSession = ReturnType<typeof useTemplates>;
function download(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function TemplateSetActionsMenu({ target, canDelete, disabledReason, onDelete, onClose }: {
  target: StudioListContextMenuTarget;
  canDelete: boolean;
  disabledReason?: string;
  onDelete: () => void;
  onClose: () => void;
}) {
  return <StudioListContextMenu target={target} canDelete={canDelete} disabledReason={disabledReason} onDelete={onDelete} onClose={onClose} />;
}

export function TemplateWorkspace() {
  const workspace = useStudioWorkspace();
  const templates = useTemplates(workspace.ownershipGeneration, workspace.writable);
  return <TemplateWorkspacePanel workspace={workspace} templates={templates} standalone />;
}

export function TemplateWorkspacePanel({ workspace, templates, standalone = false, manageHistoryShortcuts = true, onBackToContent, onSelectContentKind, onOpenFiles, onOpenBackup, onExportContent }: {
  workspace: TemplateWorkspaceSession;
  templates: TemplateStoreSession;
  standalone?: boolean;
  manageHistoryShortcuts?: boolean;
  onBackToContent?: () => void;
  onSelectContentKind?: (kind: "page" | "post") => void;
  onOpenFiles?: () => void;
  onOpenBackup?: () => void;
  onExportContent?: () => void;
}) {
  const [setId, setSetId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<{ blockId: string | null; logo: boolean } | null>(null);
  const [dialog, setDialog] = useState<NameDialog | null>(null);
  const [templateContextMenu, setTemplateContextMenu] = useState<(StudioListContextMenuTarget & { setId: string; targetId: string }) | null>(null);
  const [templateSetContextMenu, setTemplateSetContextMenu] = useState<(StudioListContextMenuTarget & { setId: string }) | null>(null);
  const [templateSetContextMenuTrigger, setTemplateSetContextMenuTrigger] = useState<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const templateContextMenuTriggerRef = useRef<HTMLElement | null>(null);
  const pendingTemplateFocusRef = useRef<string | null>(null);
  function closeTemplateContextMenu() {
    setTemplateContextMenu(null);
    requestAnimationFrame(() => templateContextMenuTriggerRef.current?.isConnected && templateContextMenuTriggerRef.current.focus());
  }
  function closeTemplateSetContextMenu() { setTemplateSetContextMenu(null); requestAnimationFrame(() => templateSetContextMenuTrigger?.isConnected && templateSetContextMenuTrigger.focus()); }
  const importRef = useRef<HTMLInputElement>(null);
  const set = templates.store.sets.find(item => item.id === setId);
  const target = set ? [...set.templates, ...set.parts].find(item => item.id === targetId) ?? set.templates[0] : undefined;
  const templateEntries = templates.store.sets.flatMap(item => [...item.templates, ...item.parts].map(entry => ({ set: item, entry })));
  const templateEntryCount = templateEntries.length;
  const media = useTemplateMedia([...(set ? templateMediaIds(set) : []), ...workspace.workspace.documents.flatMap(document => [...contentMediaIds(document.blocks), ...(document.coverImage?.mediaId ? [document.coverImage.mediaId] : [])])]);
  const writable = templates.writable && !busy;
  const exclusiveWritable = templates.exclusiveWritable && !busy;
  const templateContextMenuSet = templateContextMenu ? templates.store.sets.find(item => item.id === templateContextMenu.setId) : undefined;
  const templateContextMenuEntry = templateContextMenuSet && templateContextMenu ? [...templateContextMenuSet.templates, ...templateContextMenuSet.parts].find(item => item.id === templateContextMenu.targetId) : undefined;
  const templateContextMenuUnavailableReason = "This template is no longer available.";
  const templateContextMenuMutationReason = !writable ? "Editing is unavailable in this tab." : !templateContextMenuEntry ? templateContextMenuUnavailableReason : undefined;
  const templateContextMenuDeleteReason = templateContextMenu && templateContextMenuEntry ? templateDeleteBlockReason(templateContextMenu.setId, templateContextMenu.targetId) : templateContextMenuUnavailableReason;
  const templateContextMenuActions = templateContextMenu ? [{ label: "Rename", icon: "pencil" as const, onClick: () => renameTemplateEntry(templateContextMenu.setId, templateContextMenu.targetId), disabled: Boolean(templateContextMenuMutationReason), disabledReason: templateContextMenuMutationReason }, { label: "Duplicate", icon: "copy" as const, onClick: () => duplicateTemplateEntry(templateContextMenu.setId, templateContextMenu.targetId), disabled: Boolean(templateContextMenuMutationReason), disabledReason: templateContextMenuMutationReason }] : [];
  useStudioHistoryShortcuts(templates.undo, templates.redo, manageHistoryShortcuts && writable && !dialog);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const syncTargetFromLocation = () => {
      const nextQuery = new URLSearchParams(window.location.search);
      setSetId(nextQuery.get("set"));
      setTargetId(nextQuery.get("target"));
      setMediaTarget(null);
    };
    queueMicrotask(() => { setSetId(query.get("set")); setTargetId(query.get("target")); });
    window.addEventListener("popstate", syncTargetFromLocation);
    return () => window.removeEventListener("popstate", syncTargetFromLocation);
  }, []);
  const dialogOpen = dialog !== null;
  useEffect(() => {
    if (!dialogOpen || !dialogRef.current) return;
    dialogRef.current.showModal(); dialogRef.current.querySelector<HTMLInputElement>("input")?.select();
  }, [dialogOpen]);
  useEffect(() => {
    const pendingTemplateFocus = pendingTemplateFocusRef.current;
    if (!pendingTemplateFocus) return;
    const button = [...document.querySelectorAll<HTMLButtonElement>(".template-target-item")].find(item => item.dataset.templateTarget === pendingTemplateFocus);
    if (!button) return;
    button.focus();
    pendingTemplateFocusRef.current = null;
  }, [templateEntries]);
  useEffect(() => {
    if (!templates.ready || setId || !templates.store.sets.length) return;
    const first = templates.store.sets[0];
    const id = first.templates[0]?.id ?? null;
    queueMicrotask(() => {
      setSetId(first.id); setTargetId(id);
      const path = standalone ? "/studio/templates" : "/studio";
      const query = new URLSearchParams(standalone ? "" : "mode=templates");
      query.set("set", first.id); query.set("target", id ?? "");
      window.history.replaceState({}, "", `${path}?${query.toString()}`);
    });
  }, [setId, standalone, templates.ready, templates.store.sets]);
  function closeDialog() { dialogRef.current?.close(); setDialog(null); openerRef.current?.focus(); }
  function askName(title: string, name: string, confirm: NameDialog["confirm"]) { openerRef.current = document.activeElement as HTMLElement; setDialog({ title, name, confirm }); }
  function openSet(item: TemplateSet, id = item.templates[0]?.id) {
    setSetId(item.id); setTargetId(id ?? null); setMediaTarget(null);
    const path = standalone ? "/studio/templates" : "/studio";
    const query = new URLSearchParams(standalone ? "" : "mode=templates");
    query.set("set", item.id); query.set("target", id ?? "");
    window.history.replaceState({}, "", `${path}?${query.toString()}`);
  }
  function library() {
    setSetId(null); setTargetId(null); setMediaTarget(null);
    window.history.replaceState({}, "", standalone ? "/studio/templates" : "/studio?mode=templates");
  }
  function changeSet(next: TemplateSet) { return templates.commit(store => ({ ...store, sets: store.sets.map(item => item.id === next.id ? next : item) })); }
  function uniqueName(base: string) { let name = base; let suffix = 2; while (templates.store.sets.some(item => item.name === name)) name = `${base} ${suffix++}`; return name; }
  function createSet() {
    askName("Create Template Set", uniqueName("ACM Neutral"), name => {
      const item = createTemplateSet(name);
      const saved = templates.commit(store => ({ ...store, sets: [...store.sets, item] }));
      if (saved) openSet(item);
      return saved;
    });
  }
  async function exportSet(item: TemplateSet) {
    setBusy(true); setFeedback(null);
    try { download(await exportTemplatePackage(item), `${item.name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase() || "template"}.json`); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "Export failed."); }
    finally { setBusy(false); }
  }
  async function duplicateSet(item: TemplateSet) {
    setBusy(true); setFeedback(null);
    try { const token = studioWriteOwnership.captureWriteToken(); const id = await importTemplatePackage(await exportTemplatePackage(item), uniqueName(`${item.name} Copy`), token); window.location.assign(`${standalone ? "/studio/templates" : "/studio?mode=templates"}${standalone ? "?" : "&"}set=${encodeURIComponent(id)}`); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "Duplicate failed."); setBusy(false); }
  }
  async function importFile(file?: File) {
    if (!file) return;
    setBusy(true); setFeedback(null);
    try {
      const token = studioWriteOwnership.captureWriteToken();
      if (file.size > TEMPLATE_PACKAGE_LIMIT) throw new Error("Choose a template package smaller than 50 MB.");
      const value = validateTemplatePackage(JSON.parse(await file.text()));
      const id = await importTemplatePackage(value, uniqueName(`${value.set.name} Imported`), token);
      window.location.assign(`${standalone ? "/studio/templates" : "/studio?mode=templates"}${standalone ? "?" : "&"}set=${encodeURIComponent(id)}`);
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Import failed."); setBusy(false); }
  }
  function deleteSet(item: TemplateSet) {
    const blockedReason = templateSetDeleteBlockReason(item.id);
    if (blockedReason) { setFeedback(blockedReason); return; }
    askName(`Delete ${item.name}`, "", () => templates.commit(store => ({ ...store, sets: store.sets.filter(candidate => candidate.id !== item.id) })));
  }
  function deleteSetFromContextMenu(item: TemplateSet) {
    const blockedReason = templateSetDeleteBlockReason(item.id);
    if (blockedReason || !window.confirm(`Delete the local template set “${item.name}”?`)) return;
    templates.commit(store => ({ ...store, sets: store.sets.filter(candidate => candidate.id !== item.id) }));
  }
  function addTarget(kind: "page" | "post" | "header" | "footer") {
    if (!set) return;
    askName(`New ${kind === "page" || kind === "post" ? "Template" : "Shared Part"}`, `New ${kind}`, name => {
      const id = templateId();
      const item = { id, name, kind, nodes: kind === "page" || kind === "post" ? [{ id: templateId(), type: "element" as const, element: "content" as const }] : [] };
      const next = kind === "page" || kind === "post" ? { ...set, templates: [...set.templates, item as PageTemplate] } : { ...set, parts: [...set.parts, item as TemplatePart] };
      const saved = templates.commit(store => ({ ...store, sets: store.sets.map(candidate => candidate.id === set.id ? next : candidate) }));
      if (saved) setTargetId(id); return saved;
    });
  }
  function renameTemplateEntry(setId: string, targetId: string) {
    const targetSet = templates.store.sets.find(item => item.id === setId);
    const targetEntry = targetSet ? [...targetSet.templates, ...targetSet.parts].find(item => item.id === targetId) : undefined;
    if (!targetSet || !targetEntry) return;
    askName("Rename", targetEntry.name, name => {
      const saved = changeSet({ ...targetSet, templates: targetSet.templates.map(item => item.id === targetEntry.id ? { ...item, name } : item), parts: targetSet.parts.map(item => item.id === targetEntry.id ? { ...item, name } : item) });
      if (saved) openSet(targetSet, targetEntry.id);
      return saved;
    });
  }
  function duplicateTemplateEntry(setId: string, targetId: string) {
    const targetSet = templates.store.sets.find(item => item.id === setId);
    const targetEntry = targetSet ? [...targetSet.templates, ...targetSet.parts].find(item => item.id === targetId) : undefined;
    if (!targetSet || !targetEntry) return;
    const copy = copyTemplateData(targetEntry); copy.id = templateId(); copy.name = `${copy.name} Copy`; visitTemplateNodes(copy.nodes, node => { node.id = templateId(); });
    const next = copy.kind === "page" || copy.kind === "post" ? { ...targetSet, templates: [...targetSet.templates, copy as PageTemplate] } : { ...targetSet, parts: [...targetSet.parts, copy as TemplatePart] };
    if (changeSet(next)) openSet(targetSet, copy.id);
  }
  function templateSetDeleteBlockReason(setId: string) {
    return templates.store.assignments.some(a => a.setId === setId) ? "Reassign documents before deleting this template set." : undefined;
  }
  function templateDeleteBlockReason(setId: string, targetId: string) {
    const targetSet = templates.store.sets.find(item => item.id === setId);
    const targetEntry = targetSet ? [...targetSet.templates, ...targetSet.parts].find(item => item.id === targetId) : undefined;
    if (!targetSet || !targetEntry) return "This template is no longer available.";
    if ((targetEntry.kind === "page" || targetEntry.kind === "post") && targetSet.templates.filter(item => item.kind === targetEntry.kind).length <= 1) return `Keep at least one ${targetEntry.kind} template in this set.`;
    if (templates.store.assignments.some(a => a.setId === targetSet.id && a.templateId === targetEntry.id)) return "Reassign documents before deleting this template.";
    let referenced = false;
    [...targetSet.templates, ...targetSet.parts].forEach(item => visitTemplateNodes(item.nodes, node => { if (node.type === "part" && node.partId === targetEntry.id) referenced = true; }));
    return referenced ? "Replace shared-part references before deleting this item." : undefined;
  }
  function deleteTemplateEntry(setId: string, targetId: string) {
    const targetSet = templates.store.sets.find(item => item.id === setId);
    const targetEntry = targetSet ? [...targetSet.templates, ...targetSet.parts].find(item => item.id === targetId) : undefined;
    if (!targetSet || !targetEntry) return;
    const blockedReason = templateDeleteBlockReason(setId, targetId);
    if (blockedReason) { setFeedback(blockedReason); return; }
    askName(`Delete ${targetEntry.name}`, "", () => {
      const saved = templates.commit(store => ({ ...store, sets: store.sets.map(item => item.id === targetSet.id ? { ...item, templates: item.templates.filter(t => t.id !== targetEntry.id), parts: item.parts.filter(p => p.id !== targetEntry.id) } : item) }));
      if (saved && setId === targetSet.id && targetId === targetEntry.id) {
        const remaining = [...targetSet.templates, ...targetSet.parts].filter(item => item.id !== targetEntry.id);
        const replacement = remaining[0];
        openSet(targetSet, replacement?.id);
        if (replacement) pendingTemplateFocusRef.current = `${targetSet.id}/${replacement.id}`;
      }
      return saved;
    });
  }
  function insertMedia(asset: MediaAsset, _destination?: unknown, altText?: string) {
    if (!set || !target || !mediaTarget || !writable) return;
    if (mediaTarget.logo) changeSet({ ...set, identity: { ...set.identity, logo: { src: "", mediaId: asset.id, alt: altText || asset.altText || asset.name } } });
    else {
      const nodes = copyTemplateData(target.nodes);
      let found = false;
      visitTemplateNodes(nodes, node => {
        if (node.id !== mediaTarget.blockId) return;
        if (node.type === "image") { node.mediaId = asset.id; node.src = ""; node.alt = altText || asset.altText || asset.name; found = true; }
        if (node.type === "element" && node.element === "cover-image") { node.fixedImage = { src: "", mediaId: asset.id, alt: altText || asset.altText || asset.name }; delete node.coverImageHidden; found = true; }
      });
      if (!found) nodes.push({ id: templateId(), type: "image", src: "", mediaId: asset.id, alt: altText || asset.altText || asset.name, caption: asset.caption });
      changeSet({ ...set, templates: set.templates.map(item => item.id === target.id ? { ...item, nodes } : item), parts: set.parts.map(item => item.id === target.id ? { ...item, nodes } : item) });
    }
    setMediaTarget(null);
  }
  function renderTemplateSetCard(item: TemplateSet) {
    return <article className="template-set-card" key={item.id} onContextMenu={(event) => { event.preventDefault(); setTemplateSetContextMenuTrigger(event.currentTarget.querySelector<HTMLButtonElement>("button")); setTemplateSetContextMenu({ setId: item.id, label: item.name, x: event.clientX, y: event.clientY }); }}><button className="template-set-context-trigger" type="button" aria-label={`Actions for ${item.name}`} aria-haspopup="menu" aria-expanded={templateSetContextMenu?.setId === item.id} onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setTemplateSetContextMenuTrigger(event.currentTarget); setTemplateSetContextMenu({ setId: item.id, label: item.name, x: rect.left, y: rect.bottom }); }} onKeyDown={(event) => { if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) { event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); setTemplateSetContextMenuTrigger(event.currentTarget); setTemplateSetContextMenu({ setId: item.id, label: item.name, x: rect.left, y: rect.bottom }); } }}><StudioIcon name="more-vertical" size={18} /></button><h2>{item.name}</h2><p>{item.templates.length} templates · {item.parts.length} shared parts</p><button type="button" onClick={() => openSet(item)}>Open Templates</button><div className="template-set-actions"><button type="button" disabled={!writable} onClick={() => askName("Rename Template Set", item.name, name => changeSet({ ...item, name }))}>Rename</button><button type="button" disabled={!exclusiveWritable} onClick={() => void duplicateSet(item)}>Duplicate</button><button type="button" disabled={busy} onClick={() => void exportSet(item)}>Export</button><button type="button" disabled={!writable} onClick={() => deleteSet(item)}>Delete</button></div></article>;
  }
  const panel = <>
    {templates.syncConflict ? <div className="template-status template-inline-status template-conflict-status" role="alert"><div><strong>Another Studio tab changed this template while you were editing.</strong><span>{templates.syncConflict.conflicts.length || 1} overlapping change{templates.syncConflict.conflicts.length === 1 ? "" : "s"} need your decision. Your changes are still available in this tab.</span><small>{studioConflictDetails(templates.syncConflict)} Use Other Change to keep the saved version, or Use My Change to apply your version on top of it.</small></div><div className="template-status-actions"><button type="button" onClick={() => void templates.resolveSyncConflict("theirs")}>Use Other Change</button><button type="button" onClick={() => void templates.resolveSyncConflict("mine")}>Use My Change</button></div></div> : null}
    {!templates.syncConflict && (templates.error || feedback || media.error) ? <div className="template-status template-inline-status" role="alert"><span>{templates.error ?? feedback ?? media.error}</span>{!templates.ready ? <div className="template-status-actions"><button type="button" onClick={() => download({ raw: window.localStorage.getItem(TEMPLATE_STORAGE_KEY) }, "acm-template-recovery.json")}>Export Original Data</button></div> : null}</div> : null}
    <aside className="studio-library">
      {onBackToContent ? <>
        <div className="library-create">
          <button type="button" onClick={() => importRef.current?.click()}>Import</button>
        </div>
        <button className="library-tool-button" type="button" onClick={onOpenFiles}><span><StudioIcon name="image" /></span><strong>Files</strong><small>Images and documents</small></button>
        <a className="library-tool-button" href="/studio/designs"><span><StudioIcon name="image" /></span><strong>Design canvas</strong><small>Create and annotate images</small></a>
        <a className="library-tool-button" href="/studio/ribbon"><span><AcmIcon name="layout.columns" /></span><strong>Ribbon Library</strong><small>Explore controls and original SVG icons</small></a>
        <button className="library-tool-button" type="button" onClick={onOpenBackup}><span><StudioIcon name="archive" /></span><strong>Backup</strong><small>Export and restore</small></button>
        <div className="library-tabs" aria-label="Content type">
          <button type="button" onClick={() => onSelectContentKind?.("page")}>Pages<span>{workspace.workspace.documents.filter(item => item.kind === "page").length}</span></button>
          <button type="button" onClick={() => onSelectContentKind?.("post")}>Posts<span>{workspace.workspace.documents.filter(item => item.kind === "post").length}</span></button>
          <button className="is-active" type="button" onClick={library}>Templates<span>{templateEntryCount}</span></button>
        </div>
      </> : <>
        <a className="library-tool-button" href="/studio"><span><StudioIcon name="pencil" /></span><strong>Content</strong><small>Pages and posts</small></a>
        <button className="library-tool-button is-active" type="button" onClick={library}><span><StudioIcon name="block" /></span><strong>Templates</strong><small>Shared presentation</small></button>
      </>}
      {onBackToContent ? <div className="document-list template-document-list">
        {templateEntries.map(({ set: item, entry }) => <button className={`document-item template-target-item${item.id === set?.id && entry.id === target?.id ? " is-active" : ""}`} type="button" key={`${item.id}/${entry.id}`} data-template-target={`${item.id}/${entry.id}`} aria-haspopup="menu" aria-expanded={templateContextMenu?.setId === item.id && templateContextMenu.targetId === entry.id} onClick={() => openSet(item, entry.id)} onContextMenu={(event) => { event.preventDefault(); templateContextMenuTriggerRef.current = event.currentTarget; openSet(item, entry.id); setTemplateContextMenu({ setId: item.id, targetId: entry.id, label: entry.name, x: event.clientX, y: event.clientY }); }} onKeyDown={(event) => { if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) { event.preventDefault(); templateContextMenuTriggerRef.current = event.currentTarget; const rect = event.currentTarget.getBoundingClientRect(); openSet(item, entry.id); setTemplateContextMenu({ setId: item.id, targetId: entry.id, label: entry.name, x: rect.left + 12, y: rect.bottom - 4 }); } }}>
          <span className="document-kind-mark">{entry.kind === "post" ? "A" : entry.kind === "page" ? "P" : "H"}</span><span><strong>{entry.name}</strong><small>{entry.kind === "header" || entry.kind === "footer" ? `Shared ${entry.kind}` : `${entry.kind} template`}</small></span><i aria-hidden="true" />
        </button>)}
        {templateContextMenu ? <StudioListContextMenu target={templateContextMenu} actions={templateContextMenuActions} canDelete={writable && Boolean(templateContextMenuEntry) && !templateContextMenuDeleteReason} disabledReason={!writable ? "Editing is unavailable in this tab." : templateContextMenuDeleteReason} returnFocusRef={templateContextMenuTriggerRef} onDelete={() => deleteTemplateEntry(templateContextMenu.setId, templateContextMenu.targetId)} onClose={closeTemplateContextMenu} /> : null}
      </div> : null}
      {set ? <fieldset disabled={!writable}><legend>Add template</legend><div className="template-targets">{(["page", "post", "header", "footer"] as const).map(kind => <button type="button" key={kind} onClick={() => addTarget(kind)}>New {kind === "page" ? "Page Template" : kind === "post" ? "Post Template" : kind === "header" ? "Header" : "Footer"}</button>)}</div></fieldset> : null}
      {onBackToContent ? <><SiteNavigation /><div className="library-footer"><button type="button" onClick={onExportContent}>Export all content</button><a href="/"><StudioIcon name="arrow-left" size={16} />All Sites</a></div></> : null}
    </aside>
    {mediaTarget ? <section className="template-library" style={{ gridColumn: "span 2" }}><button type="button" onClick={() => setMediaTarget(null)}>Back to Template</button><MediaManager writable={exclusiveWritable} targetLabel={mediaTarget.logo ? "Site logo" : "Template image"} targetKind="block" onInsertImage={insertMedia} /></section> : set && target ? <TemplateEditor key={target.id} set={set} target={target} documents={workspace.workspace.documents} mediaUrls={media.urls} writable={writable} onChange={changeSet} onEditPart={id => openSet(set, id)} onOpenMedia={(blockId, logo = false) => setMediaTarget({ blockId, logo })} undo={templates.undo} redo={templates.redo} canUndo={templates.canUndo} canRedo={templates.canRedo} /> : standalone ? <section className="template-library" style={{ gridColumn: "span 2" }}><h1>Site templates</h1><p>Create a consistent page and post design. Each set has its own shared parts, identity and styles.</p><div className="template-library-actions"><button className="button-primary" type="button" disabled={!writable} onClick={createSet}><StudioIcon name="add" />Create Template Set</button><button type="button" disabled={!exclusiveWritable} onClick={() => importRef.current?.click()}>Import</button><div className="template-set-grid">{templates.store.sets.map(renderTemplateSetCard)}</div>{!templates.store.sets.length && templates.ready ? <p>No template sets yet. Create one to start with the neutral ACM design.</p> : null}</div>{templateSetContextMenu ? (() => { const item = templates.store.sets.find(candidate => candidate.id === templateSetContextMenu.setId); const blockedReason = item ? templateSetDeleteBlockReason(item.id) : "This template set is no longer available."; return <TemplateSetActionsMenu target={templateSetContextMenu} canDelete={Boolean(item && writable && !blockedReason)} disabledReason={!writable ? "Editing is unavailable in this tab." : blockedReason} onDelete={() => { if (item) deleteSetFromContextMenu(item); }} onClose={closeTemplateSetContextMenu} />; })() : null}</section> : <section className="template-library template-empty-state" style={{ gridColumn: "span 2" }}><h1>Select a template</h1><p>Choose a Page, Post or shared part from the Templates list.</p></section>}
    <input ref={importRef} hidden type="file" accept=".json,application/json" onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ""; }} />
  </>;
  const dialogElement = dialog ? <dialog ref={dialogRef} className="template-dialog" aria-labelledby="template-dialog-title" onCancel={event => { event.preventDefault(); closeDialog(); }}><button className="template-dialog-close" type="button" aria-label="Close" onClick={closeDialog}><StudioIcon name="close" /></button><form onSubmit={event => { event.preventDefault(); if (dialog.confirm(dialog.name.trim()) !== false) closeDialog(); }}><h2 id="template-dialog-title">{dialog.title}</h2>{dialog.title.startsWith("Delete ") ? <p>This removes the local item. A saved export can be imported again.</p> : <label>Name<input required maxLength={160} value={dialog.name} onChange={event => setDialog({ ...dialog, name: event.target.value })} /></label>}<div className="template-dialog-actions"><button type="button" onClick={closeDialog}>Cancel</button><button className="button-primary" type="submit" disabled={!writable}>{dialog.title.startsWith("Delete ") ? "Delete" : "Save"}</button></div></form></dialog> : null;
  if (!standalone) return <>{panel}{dialogElement}</>;
  return <div className="studio-shell studio-desktop-only template-shell">
    <header className="studio-header"><a className="studio-brand" href="/"><span>AM</span><strong>ACM Studio</strong></a><div className="studio-breadcrumbs"><button type="button" className="text-button" onClick={library}>Templates</button>{set ? <><StudioIcon name="chevron-right" size={14} /><span>{set.name}</span><StudioIcon name="chevron-right" size={14} /><strong>{target?.name ?? "Choose a template"}</strong></> : null}</div><div className="studio-state"><span className="prototype-pill">LOCAL</span><span role="status">{templates.saveLabel}</span>{!templates.writable && workspace.canRetryEditing ? <button type="button" onClick={workspace.retryEditing}>Try Editing Here</button> : null}</div><div className="studio-actions">{!set || !target || mediaTarget ? <><button type="button" className="icon-button" aria-label="Undo" disabled={!writable || !templates.canUndo} onClick={templates.undo}><StudioIcon name="undo" /></button><button type="button" className="icon-button" aria-label="Redo" disabled={!writable || !templates.canRedo} onClick={templates.redo}><StudioIcon name="redo" /></button></> : null}<a className="button-secondary" href="/studio">Content</a></div></header>
    <div className="studio-notice">Templates and media remain in this browser. Export a package or full backup to keep a copy.</div>
    <main className="studio-workspace template-workspace">{panel}</main>
    {dialogElement}
  </div>;
}
