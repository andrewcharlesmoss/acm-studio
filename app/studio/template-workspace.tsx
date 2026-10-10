"use client";
import { localFixtureName, type LocalFixtureSiteId } from "./test-site/sites";
import { setListItemBackgroundImage, type ListItemBackgroundTarget } from "./list-item-background";
import type { ListBlock } from "../content/model";
import { findListBlock } from "./list-structure";
import { exportStudioJson } from "./studio-json-export";
import { writeStudioNavigation } from "./use-studio-screen-navigation";

import { loadStoredInlineImages } from "./inline-image-library";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useStudioWorkspace } from "./use-studio-workspace";
import { useTemplates } from "./use-templates";
import { useStudioHistoryShortcuts } from "./use-studio-history-shortcuts";
import { TemplateEditor } from "./template-editor";
import { MediaManager } from "./media-manager";
import { StudioIcon } from "./studio-icons";
import { ProjectLocalLinksProvider, LocalFixtureSiteNavigation } from "./project-local-links";
import { SiteNavigation } from "./site-navigation";
import { AcmIcon } from "@acm/icons/react";
import { createDocumentTemplateNodes, copyTemplateData, templateId, templateMediaIds, visitTemplateNodes, templatePartReference, TEMPLATE_STORAGE_KEY, duplicateTemplateSet, type TemplateSet, type PageTemplate, type TemplatePart, type TemplateNode } from "./template-model";
import { templateLibraryContext, templateLibraryEntries, templateEntryExportContext, replaceTemplateLibraryContext, templateNameInitial } from "./template-library";
import { exportTemplatePackage, importTemplatePackage, TEMPLATE_PACKAGE_LIMIT, validateTemplatePackage } from "./template-package";
import { contentMediaIds, useTemplateMedia } from "./use-template-media";
import type { MediaAsset } from "./media-store";
import { studioWriteOwnership } from "./write-ownership";
import { studioConflictDetails } from "./studio-sync-description";
import { StudioListContextMenu, type StudioListContextMenuTarget } from "./studio-list-context-menu";
import type { StudioDocumentKind } from "./editor-model";
import { StudioDialog, StudioDialogActions } from "./overlays/dialog";
import { StudioButton } from "./controls/button";
import { Pane } from "./panes/pane-components";

type NameDialog = { title: string; name: string; confirm: (name: string) => boolean | void };
export type TemplateWorkspaceSession = ReturnType<typeof useStudioWorkspace>;
export type TemplateStoreSession = ReturnType<typeof useTemplates>;
export function TemplateWorkspacePanel({ siteNavigation, siteId, onSelectSite, workspace, templates, selection, onSelectionChange, libraryKind = "templates", onSelectLibraryKind, onSelectDocument, inspectorTab, onInspectorTabChange, manageHistoryShortcuts = true, onBackToContent, onOpenFiles, onOpenBackup, onExportContent, libraryPaneWidth, onLibraryPaneWidthChange, libraryPaneCollapsed, onLibraryPaneCollapsedChange, inspectorPaneWidth, onInspectorPaneWidthChange, inspectorPaneCollapsed, onInspectorPaneCollapsedChange }: {
  siteNavigation?: import("./test-site/contract").SiteNavigationReference;
  siteId?: LocalFixtureSiteId;
  onSelectSite?: (id: LocalFixtureSiteId) => void;
  workspace: TemplateWorkspaceSession;
  templates: TemplateStoreSession;
  selection?: { setId: string | null; targetId: string | null };
  onSelectionChange?: (selection: { setId: string | null; targetId: string | null }) => void;
  libraryKind?: StudioDocumentKind | "templates";
  onSelectLibraryKind?: (kind: StudioDocumentKind | "templates") => void;
  onSelectDocument?: (documentId: string) => void;
  inspectorTab?: "template" | "block" | "styles";
  onInspectorTabChange?: (tab: "template" | "block" | "styles") => void;
  manageHistoryShortcuts?: boolean;
  onBackToContent?: () => void;
  onOpenFiles?: () => void;
  onOpenBackup?: () => void;
  onExportContent?: () => void;
  libraryPaneWidth?: number;
  onLibraryPaneWidthChange?: (width: number) => void;
  libraryPaneCollapsed?: boolean;
  onLibraryPaneCollapsedChange?: (collapsed: boolean) => void;
  inspectorPaneWidth?: number;
  onInspectorPaneWidthChange?: (width: number) => void;
  inspectorPaneCollapsed?: boolean;
  onInspectorPaneCollapsedChange?: (collapsed: boolean) => void;
}) {
  const [localSelection, setLocalSelection] = useState<{ setId: string | null; targetId: string | null }>({ setId: null, targetId: null });
  const activeSelection = selection ?? localSelection;
  const setId = activeSelection.setId;
  const targetId = activeSelection.targetId;
  function changeSelection(next: { setId: string | null; targetId: string | null }) {
    if (selection) onSelectionChange?.(next);
    else setLocalSelection(next);
  }
  const changeSelectionFromEffect = useEffectEvent(changeSelection);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<{ blockId: string | null; logo: boolean; background?: boolean; item?: ListItemBackgroundTarget; targetId: string; setId: string } | null>(null);
  const [dialog, setDialog] = useState<NameDialog | null>(null);
  const [templateContextMenu, setTemplateContextMenu] = useState<(StudioListContextMenuTarget & { setId: string; targetId: string }) | null>(null);
  const [localLibraryPaneWidth, setLocalLibraryPaneWidth] = useState(290);
  const [localLibraryPaneCollapsed, setLocalLibraryPaneCollapsed] = useState(false);
  const [localInspectorPaneWidth, setLocalInspectorPaneWidth] = useState(300);
  const [localInspectorPaneCollapsed, setLocalInspectorPaneCollapsed] = useState(false);
  const resolvedLibraryPaneWidth = libraryPaneWidth ?? localLibraryPaneWidth;
  const resolvedLibraryPaneCollapsed = libraryPaneCollapsed ?? localLibraryPaneCollapsed;
  const resolvedInspectorPaneWidth = inspectorPaneWidth ?? localInspectorPaneWidth;
  const resolvedInspectorPaneCollapsed = inspectorPaneCollapsed ?? localInspectorPaneCollapsed;
  const setResolvedLibraryPaneWidth = onLibraryPaneWidthChange ?? setLocalLibraryPaneWidth;
  const setResolvedLibraryPaneCollapsed = onLibraryPaneCollapsedChange ?? setLocalLibraryPaneCollapsed;
  const setResolvedInspectorPaneWidth = onInspectorPaneWidthChange ?? setLocalInspectorPaneWidth;
  const setResolvedInspectorPaneCollapsed = onInspectorPaneCollapsedChange ?? setLocalInspectorPaneCollapsed;
  const [dialogOpener, setDialogOpener] = useState<HTMLElement | null>(null);
  const templateContextMenuTriggerRef = useRef<HTMLElement | null>(null);
  const pendingTemplateFocusRef = useRef<string | null>(null);
  function closeTemplateContextMenu() {
    setTemplateContextMenu(null);
    requestAnimationFrame(() => templateContextMenuTriggerRef.current?.isConnected && templateContextMenuTriggerRef.current.focus());
  }
  const importRef = useRef<HTMLInputElement>(null);
  const set = templates.store.sets.find(item => item.id === setId);
  const target = set ? [...set.templates, ...set.parts].find(item => item.id === targetId) : undefined;
  const showTemplateLibrary = !target;
  const templateEntries = templateLibraryEntries(templates.store);
  const templateEntryCount = templateEntries.length;
  const media = useTemplateMedia([...(set ? templateMediaIds(set) : []), ...workspace.workspace.documents.flatMap(document => [...contentMediaIds(document.blocks), ...(document.coverImage?.mediaId ? [document.coverImage.mediaId] : [])])]);
  const writable = templates.writable && !busy;
  const exclusiveWritable = templates.exclusiveWritable && !busy;
  const templateContextMenuSet = templateContextMenu ? templates.store.sets.find(item => item.id === templateContextMenu.setId) : undefined;
  const templateContextMenuEntry = templateContextMenuSet && templateContextMenu ? [...templateContextMenuSet.templates, ...templateContextMenuSet.parts].find(item => item.id === templateContextMenu.targetId) : undefined;
  const templateContextMenuUnavailableReason = "This template is no longer available.";
  const templateContextMenuMutationReason = !writable ? "Editing is unavailable in this tab." : !templateContextMenuEntry ? templateContextMenuUnavailableReason : undefined;
  const templateContextMenuDeleteReason = templateContextMenu && templateContextMenuEntry ? templateDeleteBlockReason(templateContextMenu.setId, templateContextMenu.targetId) : templateContextMenuUnavailableReason;
  const templateContextMenuActions = templateContextMenu ? [{ label: "Rename", icon: "pencil" as const, onClick: () => renameTemplateEntry(templateContextMenu.setId, templateContextMenu.targetId), disabled: Boolean(templateContextMenuMutationReason), disabledReason: templateContextMenuMutationReason }, { label: "Duplicate", icon: "copy" as const, onClick: () => duplicateTemplateEntry(templateContextMenu.setId, templateContextMenu.targetId), disabled: Boolean(templateContextMenuMutationReason), disabledReason: templateContextMenuMutationReason }, { label: "Export", icon: "download" as const, onClick: () => { if (templateContextMenuSet && templateContextMenuEntry) void exportEntry(templateContextMenuSet, templateContextMenuEntry); }, disabled: busy || !templateContextMenuEntry }] : [];
  useStudioHistoryShortcuts(templates.undo, templates.redo, manageHistoryShortcuts && writable && !dialog);
  useEffect(() => {
    const syncTargetFromLocation = () => {
      const nextQuery = new URLSearchParams(window.location.search);
      changeSelectionFromEffect({ setId: nextQuery.get("set"), targetId: nextQuery.get("target") });
      setMediaTarget(null);
    };
    window.addEventListener("popstate", syncTargetFromLocation);
    return () => window.removeEventListener("popstate", syncTargetFromLocation);
  }, [selection]);
  useEffect(() => {
    const pendingTemplateFocus = pendingTemplateFocusRef.current;
    if (!pendingTemplateFocus) return;
    const button = [...document.querySelectorAll<HTMLButtonElement>(".template-target-item")].find(item => item.dataset.templateTarget === pendingTemplateFocus);
    if (!button) return;
    button.focus();
    pendingTemplateFocusRef.current = null;
  }, [templateEntries]);
  function closeDialog() { setDialog(null); }
  function askName(title: string, name: string, confirm: NameDialog["confirm"]) { setDialogOpener(document.activeElement as HTMLElement); setDialog({ title, name, confirm }); }
  function openSet(item: TemplateSet, id = item.templates[0]?.id ?? item.parts[0]?.id) {
    changeSelection({ setId: item.id, targetId: id ?? null }); setMediaTarget(null);
    writeStudioNavigation("templates", { setId: item.id, targetId: id ?? null });
  }
  function library() {
    changeSelection({ setId: null, targetId: null });
    setMediaTarget(null);
    writeStudioNavigation("templates");
  }

  function changeSet(next: TemplateSet) { return templates.commit(store => replaceTemplateLibraryContext(store, next)); }
  async function exportEntry(item: TemplateSet, entry: PageTemplate | TemplatePart) {
    setBusy(true); setFeedback(null);
    try { exportStudioJson(await exportTemplatePackage(templateEntryExportContext(item, entry)), `${entry.name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase() || "template"}.json`, 1000); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "Export failed."); }
    finally { setBusy(false); }
  }
  async function importFile(file?: File) {
    if (!file) return;
    if (siteId) {
      try {
        if (file.size > TEMPLATE_PACKAGE_LIMIT) throw new Error("Choose a template package smaller than 50 MB.");
        const value = validateTemplatePackage(JSON.parse(await file.text()));
        if (value.media.length || templateMediaIds(value.set).length) throw new Error(`${localFixtureName(siteId ?? "test")} templates require portable image URLs. Browser-managed media cannot be imported here.`);
        const copy = duplicateTemplateSet(value.set, "Templates");
        copy.templates = copy.templates.map(template => ({ ...template, isDefault: false }));
        if (!templates.commit(store => ({ ...store, sets: [...store.sets, copy] }))) throw new Error(`The template could not be saved to ${localFixtureName(siteId ?? "test")}.`);
        openSet(copy);
      } catch (error) { setFeedback(error instanceof Error ? error.message : "Import failed."); }
      return;
    }
    setBusy(true); setFeedback(null);
    try {
      const token = studioWriteOwnership.captureWriteToken();
      if (file.size > TEMPLATE_PACKAGE_LIMIT) throw new Error("Choose a template package smaller than 50 MB.");
      const value = validateTemplatePackage(JSON.parse(await file.text()));
      value.set.templates = value.set.templates.map(template => ({ ...template, isDefault: false }));
      const id = await importTemplatePackage(value, "Templates", token);
      window.location.assign(`/studio?mode=templates&set=${encodeURIComponent(id)}`);
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Import failed."); setBusy(false); }
  }
  function addTarget(kind: "page" | "post" | "header" | "footer") {
    if (!writable) return;
    askName(`New ${kind === "page" || kind === "post" ? "Template" : "Shared Part"}`, `New ${kind}`, name => {
      const id = templateId();
      const item = { id, name, kind, ...(kind === "page" || kind === "post" ? { isDefault: false } : {}), nodes: kind === "page" || kind === "post" ? createDocumentTemplateNodes(kind) : [] };
      let destination: TemplateSet | undefined;
      const saved = templates.commit(store => {
        const context = templateLibraryContext(store);
        destination = kind === "page" || kind === "post" ? { ...context, templates: [...context.templates, item as PageTemplate] } : { ...context, parts: [...context.parts, item as TemplatePart] };
        return { ...store, sets: store.sets.some(candidate => candidate.id === context.id) ? store.sets.map(candidate => candidate.id === context.id ? destination! : candidate) : [...store.sets, destination] };
      });
      if (saved && destination) openSet(destination, id);
      return saved;
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
    const copy = copyTemplateData(targetEntry); copy.id = templateId(); copy.name = `${copy.name} Copy`; if (copy.kind === "page" || copy.kind === "post") copy.isDefault = false; visitTemplateNodes(copy.nodes, node => { node.id = templateId(); });
    const next = copy.kind === "page" || copy.kind === "post" ? { ...targetSet, templates: [...targetSet.templates, copy as PageTemplate] } : { ...targetSet, parts: [...targetSet.parts, copy as TemplatePart] };
    if (changeSet(next)) openSet(targetSet, copy.id);
  }
  function templateDeleteBlockReason(setId: string, targetId: string) {
    if (siteNavigation?.setId === setId && siteNavigation.partId === targetId) return "This shared part supplies the site navigation. Remove its blocks to hide the menu.";
    const targetSet = templates.store.sets.find(item => item.id === setId);
    const targetEntry = targetSet ? [...targetSet.templates, ...targetSet.parts].find(item => item.id === targetId) : undefined;
    if (!targetSet || !targetEntry) return "This template is no longer available.";
    if (templates.store.assignments.some(a => a.setId === targetSet.id && a.templateId === targetEntry.id)) return "Reassign documents before moving this template to the Bin.";
    if (workspace.workspace.bin.some(item => item.assignment?.setId === targetSet.id && item.assignment.templateId === targetEntry.id)) return "Restore or permanently delete the binned documents assigned to this template first.";
    if ((targetEntry.kind === "header" || targetEntry.kind === "footer" || targetEntry.kind === "overlay") && countSharedPartReferences(targetSet, targetEntry.id)) return "Remove this shared part from its templates before moving it to the Bin.";
    return undefined;
  }
  function removeSharedPartReferences(nodes: TemplateNode[], partId: string): { nodes: TemplateNode[]; removedReference: boolean } {
    const remainingNodes: TemplateNode[] = [];
    let removedReference = false;
    for (const node of nodes) {
      if (node.type === "part" && node.partId === partId) { removedReference = true; continue; }
      if (node.type === "group" || node.type === "section" || node.type === "column") {
        const nested = removeSharedPartReferences(node.children, partId);
        removedReference ||= nested.removedReference;
        if (!nested.nodes.length && nested.removedReference) continue;
        remainingNodes.push(nested.removedReference ? { ...node, children: nested.nodes } : node);
        continue;
      }
      if (node.type === "columns") {
        let removedColumnReference = false;
        const children = node.children.map(column => {
          const nested = removeSharedPartReferences(column.children, partId);
          removedColumnReference ||= nested.removedReference;
          return nested.removedReference ? { ...column, children: nested.nodes } : column;
        });
        removedReference ||= removedColumnReference;
        remainingNodes.push(removedColumnReference ? { ...node, children } : node);
        continue;
      }
      remainingNodes.push(node);
    }
    return { nodes: remainingNodes, removedReference };
  }
  function countSharedPartReferences(set: TemplateSet, partId: string) {
    let count = 0;
    [...set.templates, ...set.parts].forEach(item => visitTemplateNodes(item.nodes, node => {
      if (templatePartReference(node) === partId) count += 1;
    }));
    return count;
  }
  function deleteTemplateEntry(setId: string, targetId: string) {
    const targetSet = templates.store.sets.find(item => item.id === setId);
    const targetEntry = targetSet ? [...targetSet.templates, ...targetSet.parts].find(item => item.id === targetId) : undefined;
    if (!targetSet || !targetEntry) return;
    const blockedReason = templateDeleteBlockReason(setId, targetId);
    if (blockedReason) { setFeedback(blockedReason); return; }
    const sharedPartReferences = targetEntry.kind === "header" || targetEntry.kind === "footer" || targetEntry.kind === "overlay"
      ? countSharedPartReferences(targetSet, targetEntry.id)
      : 0;
    const message = sharedPartReferences
      ? `Remove this shared part from its ${sharedPartReferences} template reference${sharedPartReferences === 1 ? "" : "s"} before moving it to the Bin.`
      : "You can restore this item from the Bin until you permanently delete it.";
    if (sharedPartReferences) { setFeedback(message); return; }
    const saved = templates.commit(store => ({ ...store, bin: [...store.bin, { id: templateId(), kind: "template", deletedAt: new Date().toISOString(), setId: targetSet.id, setName: targetSet.name, entry: copyTemplateData(targetEntry), setSnapshot: copyTemplateData(targetSet) }], sets: store.sets.map(item => {
        if (item.id !== targetSet.id) return item;
        const templates = item.templates.filter(template => template.id !== targetEntry.id).map(template => {
          if (!sharedPartReferences) return template;
          const result = removeSharedPartReferences(template.nodes, targetEntry.id);
          return result.removedReference ? { ...template, nodes: result.nodes } : template;
        });
        const parts = item.parts.filter(part => part.id !== targetEntry.id).map(part => {
          if (!sharedPartReferences) return part;
          const result = removeSharedPartReferences(part.nodes, targetEntry.id);
          return result.removedReference ? { ...part, nodes: result.nodes } : part;
        });
        return { ...item, templates, parts };
      }) }));
      if (saved && activeSelection.setId === targetSet.id && activeSelection.targetId === targetEntry.id) {
        const remaining = [...targetSet.templates, ...targetSet.parts].filter(item => item.id !== targetEntry.id);
        const replacement = remaining[0];
        if (replacement) openSet(targetSet, replacement.id); else library();
        if (replacement) pendingTemplateFocusRef.current = `${targetSet.id}/${replacement.id}`;
      }
    if (!saved) setFeedback("The template could not be moved to the Bin.");
  }
  function insertMedia(asset: MediaAsset, _destination?: unknown, altText?: string) {
    if (!set || !target || !mediaTarget || !writable) return;
    if (target.id !== mediaTarget.targetId || set.id !== mediaTarget.setId) { setFeedback("The media target changed. Select it and try again."); return; }
    if (mediaTarget.logo) changeSet({ ...set, identity: { ...set.identity, logo: { src: "", mediaId: asset.id, alt: altText || asset.altText || asset.name } } });
    else {
      const nodes = copyTemplateData(target.nodes);
      let found = false;
      visitTemplateNodes(nodes, node => {
        if (mediaTarget.background && node.type === "list") {
          const selected = mediaTarget.blockId ? findListBlock(node, mediaTarget.blockId) : null;
          if (!selected) return;
          if (mediaTarget.item) {
            const next = setListItemBackgroundImage(node, mediaTarget.item, asset.id);
            if (next) { Object.assign(node, next); found = true; }
          } else {
            (selected as ListBlock).visualStyle = { ...selected.visualStyle, backgroundImageMediaId: asset.id };
            found = true;
          }
          return;
        }
        if (node.id !== mediaTarget.blockId) return;
        if (mediaTarget.background) {
          if (node.type === "group" || node.type === "quote" || node.type === "heading" || node.type === "code" || node.type === "document-title" || node.type === "element" && (node.element === "content" || node.element === "document-title")) { node.visualStyle = { ...node.visualStyle, backgroundImageMediaId: asset.id }; found = true; }
          return;
        }
        if (node.type === "image") { node.mediaId = asset.id; node.src = ""; node.alt = altText || asset.altText || asset.name; found = true; }
        if (node.type === "element" && node.element === "cover-image") { node.fixedImage = { src: "", mediaId: asset.id, alt: altText || asset.altText || asset.name }; delete node.coverImageHidden; found = true; }
      });
      if (!found && mediaTarget.background) { setFeedback("The background image target is no longer available. Select the block and try again."); return; }
      if (!found) nodes.push({ id: templateId(), type: "image", src: "", mediaId: asset.id, alt: altText || asset.altText || asset.name, caption: asset.caption });
      changeSet({ ...set, templates: set.templates.map(item => item.id === target.id ? { ...item, nodes } : item), parts: set.parts.map(item => item.id === target.id ? { ...item, nodes } : item) });
    }
    setMediaTarget(null);
  }
  const panel = <>
    {templates.syncConflict ? <div className="template-status template-inline-status template-conflict-status" role="alert"><div><strong>Another Studio tab changed this template while you were editing.</strong><span>{templates.syncConflict.conflicts.length || 1} overlapping change{templates.syncConflict.conflicts.length === 1 ? "" : "s"} need your decision. Your changes are still available in this tab.</span><small>{studioConflictDetails(templates.syncConflict)} Use Other Change to keep the saved version, or Use My Change to apply your version on top of it.</small></div><div className="template-status-actions"><button type="button" onClick={() => void templates.resolveSyncConflict("theirs")}>Use Other Change</button><button type="button" onClick={() => void templates.resolveSyncConflict("mine")}>Use My Change</button></div></div> : null}
    {!templates.syncConflict && (templates.error || feedback || media.error) ? <div className="template-status template-inline-status" role="alert"><span>{templates.error ?? feedback ?? media.error}</span>{!templates.ready ? <div className="template-status-actions"><button type="button" onClick={() => exportStudioJson({ raw: window.localStorage.getItem(TEMPLATE_STORAGE_KEY) }, "acm-template-recovery.json", 1000)}>Export Original Data</button></div> : null}</div> : null}
    {onBackToContent ? <Pane trackClassName="studio-library-track" className="studio-library" bodyClassName="studio-library-body" label="Studio Navigation" side="left" width={resolvedLibraryPaneWidth} onWidthChange={setResolvedLibraryPaneWidth} minWidth={270} maxWidth={480} collapsed={resolvedLibraryPaneCollapsed} onCollapsedChange={setResolvedLibraryPaneCollapsed} collapseIcon={<StudioIcon name="chevron-right" size={18} />}>
      <div className="library-create">
        <button type="button" onClick={library} aria-pressed={showTemplateLibrary}>Templates</button>
        <button type="button" disabled={!exclusiveWritable} onClick={() => importRef.current?.click()}>Import</button>
      </div>
      <button className="library-tool-button" type="button" onClick={onOpenFiles}><span><StudioIcon name="image" /></span><strong>Files</strong><small>Images and documents</small></button>
      <a className="library-tool-button" href="/studio/designs"><span><StudioIcon name="image" /></span><strong>Design Canvas</strong><small>Create and annotate images</small></a>
      <a className="library-tool-button" href="/studio/ui"><span><AcmIcon name="layout.columns" /></span><strong>Studio UI Library</strong><small>Workspace, Ribbon, panes, shared icons and Styles</small></a>
      <button className="library-tool-button" type="button" onClick={onOpenBackup}><span><StudioIcon name="archive" /></span><strong>Backup</strong><small>Export and restore</small></button>
      <a className="library-tool-button" href={siteId ? `/studio?site=${siteId}&mode=bin` : "/studio?mode=bin"}><span><StudioIcon name="archive" /></span><strong>Bin</strong><small>{workspace.workspace.bin.length + templates.store.bin.length} deleted items</small></a>
      <div className="library-tabs" aria-label="Content type">
        <button className={libraryKind === "page" ? "is-active" : ""} type="button" aria-pressed={libraryKind === "page"} onClick={() => onSelectLibraryKind?.("page")}>Pages<span>{workspace.workspace.documents.filter(item => item.kind === "page").length}</span></button>
        <button className={libraryKind === "post" ? "is-active" : ""} type="button" aria-pressed={libraryKind === "post"} onClick={() => onSelectLibraryKind?.("post")}>Posts<span>{workspace.workspace.documents.filter(item => item.kind === "post").length}</span></button>
        <button className={libraryKind === "templates" ? "is-active" : ""} type="button" aria-pressed={libraryKind === "templates"} onClick={() => onSelectLibraryKind?.("templates")}>Templates<span>{templateEntryCount}</span></button>
      </div>
      <div className="document-list template-document-list">
        {libraryKind === "templates" ? <>
        {templateEntries.map(({ set: item, entry }) => <button className={`document-item template-target-item${!showTemplateLibrary && item.id === set?.id && entry.id === target?.id ? " is-active" : ""}`} type="button" key={`${item.id}/${entry.id}`} data-template-target={`${item.id}/${entry.id}`} aria-haspopup="menu" aria-expanded={templateContextMenu?.setId === item.id && templateContextMenu.targetId === entry.id} onClick={() => openSet(item, entry.id)} onContextMenu={(event) => { event.preventDefault(); templateContextMenuTriggerRef.current = event.currentTarget; openSet(item, entry.id); setTemplateContextMenu({ setId: item.id, targetId: entry.id, label: entry.name, x: event.clientX, y: event.clientY }); }} onKeyDown={(event) => { if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) { event.preventDefault(); templateContextMenuTriggerRef.current = event.currentTarget; const rect = event.currentTarget.getBoundingClientRect(); openSet(item, entry.id); setTemplateContextMenu({ setId: item.id, targetId: entry.id, label: entry.name, x: rect.left + 12, y: rect.bottom - 4 }); } }}>
          <span className="document-kind-mark" aria-hidden="true">{templateNameInitial(entry.name)}</span><span><strong>{entry.name}</strong><small>{entry.kind === "header" || entry.kind === "footer" || entry.kind === "overlay" ? `Shared ${entry.kind}` : `${entry.kind} template`}</small></span><i aria-hidden="true" />
        </button>)}

        </> : workspace.workspace.documents.filter(document => document.kind === libraryKind).map(document => <button className={`document-item${document.id === workspace.workspace.activeDocumentId ? " is-active" : ""}`} type="button" key={document.id} onClick={() => onSelectDocument?.(document.id)}>
          <span className="document-kind-mark">{document.kind === "page" ? "P" : "A"}</span><span><strong>{document.title}</strong><small>/{document.slug}</small></span><span className={`document-status is-${document.status}`}>{document.status.charAt(0).toUpperCase() + document.status.slice(1)}</span>
        </button>)}
        {libraryKind !== "templates" && !workspace.workspace.documents.some(document => document.kind === libraryKind) ? <p className="document-list-empty">No {libraryKind === "page" ? "pages" : "posts"} yet.</p> : null}
      </div>
      {libraryKind === "templates" ? <fieldset disabled={!writable}><legend>Add template</legend><div className="template-targets">{(["page", "post", "header", "footer"] as const).map(kind => <button type="button" key={kind} onClick={() => addTarget(kind)}>New {kind === "page" ? "Page Template" : kind === "post" ? "Post Template" : kind === "header" ? "Header" : "Footer"}</button>)}</div></fieldset> : null}
      <>{siteId ? <LocalFixtureSiteNavigation selectedSite={siteId} onSelectSite={onSelectSite} /> : <SiteNavigation />}<div className="library-footer"><button type="button" onClick={onExportContent}>Export all content</button><a href="/"><StudioIcon name="arrow-left" size={16} />All Sites</a></div></>
    </Pane> : <aside className="studio-library">
      <a className="library-tool-button" href="/studio"><span><StudioIcon name="pencil" /></span><strong>Content</strong><small>Pages and posts</small></a>
      <a className="library-tool-button" href={siteId ? `/studio?site=${siteId}&mode=bin` : "/studio?mode=bin"}><span><StudioIcon name="archive" /></span><strong>Bin</strong><small>{workspace.workspace.bin.length + templates.store.bin.length} deleted items</small></a>
      <button className="library-tool-button is-active" type="button" onClick={library}><span><StudioIcon name="block" /></span><strong>Templates</strong><small>Shared presentation</small></button>
    </aside>}
    {mediaTarget ? <section className="template-library" style={{ gridColumn: "span 2" }}><button type="button" onClick={() => setMediaTarget(null)}>Back to Template</button><MediaManager writable={exclusiveWritable} targetLabel={mediaTarget.logo ? "Site logo" : mediaTarget.background ? "Background image" : "Template image"} targetKind={mediaTarget.background ? "background" : "block"} onInsertImage={insertMedia} /></section> : !showTemplateLibrary && set && target ? <TemplateEditor siteId={siteId} fixtureLinks={Boolean(siteId)} initialSelectedBlockId={target.kind === "overlay" ? target.nodes[0]?.id : siteNavigation?.setId === set.id && siteNavigation.partId === target.id ? target.nodes.find(node => node.type === "element" && node.element === "navigation")?.id : undefined} siteNavigationPartId={siteNavigation?.setId === set.id ? siteNavigation.partId : undefined} sharedSiteNavigation={siteNavigation?.setId === set.id && siteNavigation.partId === target.id} key={`${set.id}/${target.id}`} set={set} target={target} documents={workspace.workspace.documents} mediaUrls={media.urls} loadInlineImages={loadStoredInlineImages} writable={writable} onChange={changeSet} onEditPart={(id, nextSet) => openSet(nextSet ?? set, id)} onOpenMedia={(blockId, logo = false, background = false, item) => { if (siteId) { setFeedback(`${localFixtureName(siteId ?? "test")} templates use portable image URLs. Browser-managed files remain in Studio Drafts.`); return; } setMediaTarget({ blockId, logo, background, item, targetId: target.id, setId: set.id }); }} inspectorTab={inspectorTab} onInspectorTabChange={onInspectorTabChange} inspectorPaneWidth={resolvedInspectorPaneWidth} onInspectorPaneWidthChange={setResolvedInspectorPaneWidth} inspectorPaneCollapsed={resolvedInspectorPaneCollapsed} onInspectorPaneCollapsedChange={setResolvedInspectorPaneCollapsed} undo={templates.undo} redo={templates.redo} canUndo={templates.canUndo} canRedo={templates.canRedo} /> : <section className="template-library" style={{ gridColumn: "span 2" }}><h1>Templates</h1><p>Reusable layouts and shared parts.</p><div className="template-library-actions">{(["page", "post", "header", "footer"] as const).map(kind => <StudioButton type="button" key={kind} disabled={!writable} onClick={() => addTarget(kind)}>New {kind === "page" ? "Page Template" : kind === "post" ? "Post Template" : kind === "header" ? "Header" : "Footer"}</StudioButton>)}<StudioButton variant="secondary" type="button" disabled={!exclusiveWritable} onClick={() => importRef.current?.click()}>Import</StudioButton></div>
      <ul className="template-entry-list" aria-label="Templates">{templateEntries.map(({ set: item, entry }) => <li key={`${item.id}/${entry.id}`}>
        <button className="template-entry-open" type="button" onClick={() => openSet(item, entry.id)}><span className="document-kind-mark" aria-hidden="true">{templateNameInitial(entry.name)}</span><span><strong>{entry.name}</strong><small>{entry.kind === "page" || entry.kind === "post" ? `${entry.kind === "page" ? "Page" : "Post"} template` : `Shared ${entry.kind}`}</small></span></button>
        <button className="template-entry-actions" type="button" aria-label={`Actions for ${entry.name}`} aria-haspopup="menu" aria-expanded={templateContextMenu?.setId === item.id && templateContextMenu.targetId === entry.id} onClick={event => { templateContextMenuTriggerRef.current = event.currentTarget; const rect = event.currentTarget.getBoundingClientRect(); setTemplateContextMenu({ setId: item.id, targetId: entry.id, label: entry.name, x: rect.left, y: rect.bottom }); }}><StudioIcon name="more-vertical" /></button>
      </li>)}</ul>
      {!templateEntryCount && templates.ready ? <p>No templates yet. Create a template or shared part to begin.</p> : null}

    </section>}

    {templateContextMenu ? <StudioListContextMenu target={templateContextMenu} actions={templateContextMenuActions} canDelete={writable && Boolean(templateContextMenuEntry) && !templateContextMenuDeleteReason} disabledReason={!writable ? "Editing is unavailable in this tab." : templateContextMenuDeleteReason} returnFocusRef={templateContextMenuTriggerRef} onDelete={() => deleteTemplateEntry(templateContextMenu.setId, templateContextMenu.targetId)} onClose={closeTemplateContextMenu} /> : null}
    <input ref={importRef} hidden type="file" accept=".json,application/json" onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ""; }} />
  </>;
  const dialogElement = dialog ? <StudioDialog title={dialog.title} className="template-dialog" returnFocus={dialogOpener} selectInitialText onClose={closeDialog}>
    <form onSubmit={event => { event.preventDefault(); if (dialog.confirm(dialog.name.trim()) !== false) closeDialog(); }}>
      <label>Name<input required maxLength={160} value={dialog.name} onChange={event => setDialog({ ...dialog, name: event.target.value })} /></label>
      <StudioDialogActions><StudioButton variant="secondary" type="button" onClick={closeDialog}>Cancel</StudioButton><StudioButton type="submit" disabled={!writable}>Save</StudioButton></StudioDialogActions>
    </form>
  </StudioDialog> : null;
  return siteId ? <ProjectLocalLinksProvider>{panel}{dialogElement}</ProjectLocalLinksProvider> : <>{panel}{dialogElement}</>;
}
