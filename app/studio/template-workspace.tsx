"use client";
import { DragPlacementIndicator } from "./drag-placement-indicator";
import { useLibraryReordering } from "./use-library-reordering";
import { LibraryDragHandle } from "./library-drag-handle";
import { reorderLibraryDocuments, reorderLibraryTemplates, type LibraryMove } from "./library-reordering";
import { templateMediaTargetKind } from "./template-media-target";
import { validateGlobalTemplateLibrary } from "./global-template-contract";
import { isLocalFixtureSiteId, localFixtureName, type LocalFixtureSiteId } from "./test-site/sites";
import { neutralGlobalTemplatePreview, siteGlobalTemplatePreview, type GlobalTemplatePreviewSite, type GlobalTemplatePreviewSource } from "./global-template-preview";
import { setListItemBackgroundImage, type ListItemBackgroundTarget } from "./list-item-background";
import type { ListBlock } from "../content/model";
import { findListBlock } from "./list-structure";
import { exportStudioJson } from "./studio-json-export";
import { writeStudioNavigation } from "./use-studio-screen-navigation";

import { loadStoredInlineImages } from "./inline-image-library";
import { useEffect, useLayoutEffect, useEffectEvent, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AcmIcon } from "@acm/icons/react";
import { useStudioWorkspace } from "./use-studio-workspace";
import { useTemplates } from "./use-templates";
import { useStudioHistoryShortcuts } from "./use-studio-history-shortcuts";
import { TemplateEditor } from "./template-editor";
import { MediaManager } from "./media-manager";
import { StudioIcon } from "./studio-icons";
import { createDocumentTemplateNodes, copyTemplateData, templateId, templateMediaIds, visitTemplateNodes, templatePartReference, TEMPLATE_STORAGE_KEY, duplicateTemplateSet, type TemplateSet, type PageTemplate, type TemplatePart, type TemplateNode } from "./template-model";
import { templateLibraryContext, templateLibraryEntries, templateEntryExportContext, replaceTemplateLibraryContext, templateNameInitial } from "./template-library";
import { exportTemplatePackage, importTemplatePackage, TEMPLATE_PACKAGE_LIMIT, validateTemplatePackage } from "./template-package";
import { contentMediaIds, useTemplateMedia } from "./use-template-media";
import type { MediaAsset } from "./media-store";
import { studioWriteOwnership } from "./write-ownership";
import { studioConflictDetails } from "./studio-sync-description";
import { StudioListContextMenu, type StudioListContextMenuAction, type StudioListContextMenuTarget } from "./studio-list-context-menu";
import type { StudioDocumentKind } from "./editor-model";
import { StudioDialog, StudioDialogActions } from "./overlays/dialog";
import { StudioButton } from "./controls/button";
import { StudioTooltipGroup } from "./controls/tooltip-group";
import { StudioNavigationFrame } from "./studio-navigation-frame";

type NameDialog = { title: string; name: string; confirm: (name: string) => boolean | void };
export type TemplateWorkspaceSession = ReturnType<typeof useStudioWorkspace>;
export type TemplateStoreSession = ReturnType<typeof useTemplates>;
const templateCreationActions = [
  { kind: "post", label: "New Post Template", icon: "document.new-post" },
  { kind: "page", label: "New Page Template", icon: "document.new-page" },
  { kind: "header", label: "New Header", icon: "layout.header" },
  { kind: "footer", label: "New Footer", icon: "layout.footer" },
] as const;
function TemplateCreationActions({ writable, onCreate, onImport, importWritable = false }: {
  writable: boolean; onCreate: (kind: "post" | "page" | "header" | "footer") => void;
  onImport?: () => void; importWritable?: boolean;
}) {
  return <StudioTooltipGroup className="library-create template-create" role="group" aria-label="Create template" style={{ "--library-create-columns": onImport ? 5 : 4 } as CSSProperties}>
    {templateCreationActions.map(({ kind, label, icon }) => <button type="button" key={kind} disabled={!writable} aria-label={label} data-studio-tooltip={label} onClick={() => onCreate(kind)}><AcmIcon name={icon} scale="Regular-S" size={20} /></button>)}
    {onImport ? <button type="button" disabled={!importWritable} aria-label="Import Templates" data-studio-tooltip="Import Templates" onClick={onImport}><AcmIcon name="action.upload" scale="Regular-S" size={20} /></button> : null}
  </StudioTooltipGroup>;
}
export function TemplateWorkspacePanel({ dependencyActions, viewControls, onCanvasVisibilityChange, editingScope, globalLibrary, previewSite = "neutral", onPreviewSiteChange, previewSources, navigationControls, siteNavigationEditor, siteNavigation, siteId, onSelectSite, workspace, templates, selection, onSelectionChange, libraryKind = "templates", onSelectLibraryKind, onSelectDocument, onReorderDocuments, inspectorTab, onInspectorTabChange, manageHistoryShortcuts = true, onBackToContent, onSelectWorkspace, onNewDocument, onNewFromTemplate, contentWritable, contentTemplateWritable, onOpenBin, onOpenFiles, onOpenBackup, onExportContent, libraryPaneWidth, onLibraryPaneWidthChange, libraryPaneCollapsed, onLibraryPaneCollapsedChange, inspectorPaneWidth, onInspectorPaneWidthChange, inspectorPaneCollapsed, onInspectorPaneCollapsedChange }: {
  dependencyActions?: { manage: (target: { setId: string; entryId: string }) => void; move: (target: { setId: string; entryId: string }) => Promise<void>; reason: (target: { setId: string; entryId: string }) => string | undefined };
  viewControls?: { viewport: import("./studio-view-menu").StudioViewport; onViewportChange: (viewport: import("./studio-view-menu").StudioViewport) => void };
  onCanvasVisibilityChange?: (visible: boolean) => void;
  navigationControls?: ReactNode;
  siteNavigationEditor?: ReactNode;
  previewSite?: GlobalTemplatePreviewSite;
  onPreviewSiteChange?: (site: GlobalTemplatePreviewSite) => void;
  previewSources?: Record<LocalFixtureSiteId, GlobalTemplatePreviewSource>;
  editingScope?: "global" | "site";
  globalLibrary?: import("./global-template-contract").GlobalTemplateLibrary | null;
  siteNavigation?: import("./test-site/contract").SiteNavigationReference;
  siteId?: LocalFixtureSiteId;
  onSelectSite?: (id: LocalFixtureSiteId) => void;
  workspace: TemplateWorkspaceSession;
  templates: TemplateStoreSession;
  selection?: { setId: string | null; targetId: string | null };
  onSelectionChange?: (selection: { setId: string | null; targetId: string | null }) => void | boolean | Promise<void | boolean>;
  libraryKind?: StudioDocumentKind | "templates";
  onSelectLibraryKind?: (kind: StudioDocumentKind | "templates") => void;
  onSelectDocument?: (documentId: string) => void;
  onReorderDocuments?: (kind: StudioDocumentKind, move: LibraryMove) => boolean;
  inspectorTab?: "template" | "block" | "styles";
  onInspectorTabChange?: (tab: "template" | "block" | "styles") => void;
  manageHistoryShortcuts?: boolean;
  onBackToContent?: () => void;
  onSelectWorkspace?: () => void;
  onNewDocument?: (kind: StudioDocumentKind) => void;
  onNewFromTemplate?: () => void;
  contentWritable?: boolean;
  contentTemplateWritable?: boolean;
  onOpenBin?: () => void;
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
    if (selection) return onSelectionChange?.(next);
    setLocalSelection(next); return true;
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
  const previewSource = previewSite === "neutral" ? undefined : previewSources?.[previewSite];
  let preview = editingScope === "global" && set ? neutralGlobalTemplatePreview(set) : undefined;
  let previewStatus: string | undefined;
  if (preview && previewSite !== "neutral") {
    if (previewSource?.error) previewStatus = `${localFixtureName(previewSite)} preview unavailable. Showing neutral content.`;
    else if (!previewSource?.document || !globalLibrary) previewStatus = `Loading ${localFixtureName(previewSite)} preview…`;
    else {
      try { preview = siteGlobalTemplatePreview(set!, globalLibrary, previewSource.document); }
      catch { previewStatus = `${localFixtureName(previewSite)} preview unavailable. Showing neutral content.`; }
    }
  }
  const editorSet = preview?.set ?? set;
  const previewControls = editingScope === "global" ? <><label>Preview With<select value={previewSite} onChange={event => onPreviewSiteChange?.(isLocalFixtureSiteId(event.target.value) ? event.target.value : "neutral")}><option value="neutral">Neutral</option><option value="test">Test</option><option value="test2">Test2</option></select></label>{previewStatus ? <span role="status">{previewStatus}</span> : null}</> : undefined;
  const target = set ? [...set.templates, ...set.parts].find(item => item.id === targetId) : undefined;
  const showTemplateLibrary = !target;
  const canvasVisible = Boolean(set && target && !mediaTarget && !siteNavigationEditor);
  useLayoutEffect(() => { onCanvasVisibilityChange?.(canvasVisible); }, [canvasVisible, onCanvasVisibilityChange]);
  const templateEntries = templateLibraryEntries(templates.store);
  const templateEntryCount = templateEntries.length;
  const media = useTemplateMedia([...(set ? templateMediaIds(set) : []), ...workspace.workspace.documents.flatMap(document => [...contentMediaIds(document.blocks), ...(document.coverImage?.mediaId ? [document.coverImage.mediaId] : [])])]);
  const writable = templates.writable && !busy;
  const entryIds = libraryKind === "templates" ? templateEntries.map(({ set, entry }) => `${set.id}/${entry.id}`) : workspace.workspace.documents.filter(item => item.kind === libraryKind).map(item => item.id);
  const reordering = useLibraryReordering(entryIds, libraryKind === "templates" ? writable : (contentWritable ?? workspace.writable), move => libraryKind === "templates"
    ? templates.commit(store => reorderLibraryTemplates(store, move))
    : onReorderDocuments ? onReorderDocuments(libraryKind, move) : workspace.commit(current => reorderLibraryDocuments(current, libraryKind, move)), `${siteId ?? "drafts"}/${libraryKind}`);
  const exclusiveWritable = templates.exclusiveWritable && !busy;
  const templateContextMenuSet = templateContextMenu ? templates.store.sets.find(item => item.id === templateContextMenu.setId) : undefined;
  const templateContextMenuEntry = templateContextMenuSet && templateContextMenu ? [...templateContextMenuSet.templates, ...templateContextMenuSet.parts].find(item => item.id === templateContextMenu.targetId) : undefined;
  const templateContextMenuUnavailableReason = "This template is no longer available.";
  const templateContextMenuMutationReason = !writable ? "Editing is unavailable in this tab." : !templateContextMenuEntry ? templateContextMenuUnavailableReason : undefined;
  const templateContextMenuDeleteReason = templateContextMenu && templateContextMenuEntry ? templateDeleteBlockReason(templateContextMenu.setId, templateContextMenu.targetId) : templateContextMenuUnavailableReason;
  const templateContextMenuActions: StudioListContextMenuAction[] = templateContextMenu ? [{ label: "Rename", icon: "pencil" as const, onClick: () => renameTemplateEntry(templateContextMenu.setId, templateContextMenu.targetId), disabled: Boolean(templateContextMenuMutationReason), disabledReason: templateContextMenuMutationReason }, { label: "Duplicate", icon: "copy" as const, onClick: () => duplicateTemplateEntry(templateContextMenu.setId, templateContextMenu.targetId), disabled: Boolean(templateContextMenuMutationReason), disabledReason: templateContextMenuMutationReason }, { label: "Export", icon: "download" as const, onClick: () => { if (templateContextMenuSet && templateContextMenuEntry) void exportEntry(templateContextMenuSet, templateContextMenuEntry); }, disabled: busy || !templateContextMenuEntry }] : [];
  if (templateContextMenu && dependencyActions) templateContextMenuActions.unshift({ label: "Manage dependencies", icon: "link", onClick: () => dependencyActions.manage({ setId: templateContextMenu.setId, entryId: templateContextMenu.targetId }), disabled: !templateContextMenuEntry });
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
  async function openSet(item: TemplateSet, id = item.templates[0]?.id ?? item.parts[0]?.id) {
    if (await changeSelection({ setId: item.id, targetId: id ?? null }) === false) return;
    setMediaTarget(null);
    writeStudioNavigation("templates", { setId: item.id, targetId: id ?? null, scope: editingScope });
  }
  async function library() {
    if (await changeSelection({ setId: null, targetId: null }) === false) return;
    setMediaTarget(null);
    writeStudioNavigation("templates", { setId: null, targetId: null, scope: "global" });
  }

  function changeSet(next: TemplateSet) { return templates.commit(store => {
    const original = store.sets.find(item => item.id === next.id);
    return replaceTemplateLibraryContext(store, editingScope === "global" && original ? { ...next, identity: original.identity, navigation: original.navigation, socialLinks: original.socialLinks } : next);
  }); }
  async function exportEntry(item: TemplateSet, entry: PageTemplate | TemplatePart) {
    setBusy(true); setFeedback(null);
    try { exportStudioJson(await exportTemplatePackage(templateEntryExportContext(item, entry)), `${entry.name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase() || "template"}.json`, 1000); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "Export failed."); }
    finally { setBusy(false); }
  }
  async function importFile(file?: File) {
    if (!file) return;
    if (editingScope === "global") {
      try {
        if (file.size > 1024 * 1024) throw new Error("Choose a global template file smaller than 1 MB.");
        const parsed = JSON.parse(await file.text());
        if (parsed?.format === "acm-global-templates") {
          const restored = validateGlobalTemplateLibrary(parsed);
          if (!window.confirm("Restore these global originals for every site? Site identity, menu links and document content are preserved. The previous originals remain in Studio’s local recovery history.")) return;
          if (!templates.commit(() => restored.templates)) throw new Error("Global templates cannot be restored in this tab.");
          library();
          return;
        }
        const value = validateTemplatePackage(parsed);
        if (value.media.length || templateMediaIds(value.set).length) throw new Error("Global templates require portable image URLs.");
        const copy = duplicateTemplateSet(value.set, "Templates");
        copy.templates = copy.templates.map(template => ({ ...template, isDefault: false }));
        copy.identity = { name: "Your Site", homeUrl: "/", copyright: "" }; copy.navigation = []; copy.socialLinks = [];
        if (!templates.commit(store => ({ ...store, sets: [...store.sets, copy] }))) throw new Error("Global templates could not be imported.");
        openSet(copy);
      } catch (error) { setFeedback(error instanceof Error ? error.message : "Import failed."); }
      return;
    }
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
    if (editingScope === "global") return dependencyActions?.reason({ setId, entryId: targetId }) ?? (dependencyActions ? undefined : "Loading template dependencies…");
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
    if (editingScope === "global" && dependencyActions) { void dependencyActions.move({ setId, entryId: targetId }); return; }
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
  const scopeNotice = editingScope ? <div className="template-scope-notice" role="status"><span>Global template — layout and style changes apply to every site.</span><StudioTooltipGroup className="template-scope-actions" role="group" aria-label="Global template actions">
    {navigationControls}
    {globalLibrary ? <StudioButton type="button" variant="secondary" aria-label="Export Saved Global Library" data-studio-tooltip="Export Saved Global Library" onClick={() => exportStudioJson(globalLibrary, "acm-global-template-library.json")}><AcmIcon name="action.download" scale="Regular-S" size={20} /></StudioButton> : null}
  </StudioTooltipGroup></div> : null;
  const panel = <>
    {templates.syncConflict ? <div className="template-status template-inline-status template-conflict-status" role="alert"><div><strong>Another Studio tab changed this template while you were editing.</strong><span>{templates.syncConflict.conflicts.length || 1} overlapping change{templates.syncConflict.conflicts.length === 1 ? "" : "s"} need your decision. Your changes are still available in this tab.</span><small>{studioConflictDetails(templates.syncConflict)} Use Other Change to keep the saved version, or Use My Change to apply your version on top of it.</small></div><div className="template-status-actions">{editingScope === "global" && globalLibrary ? <button type="button" onClick={() => exportStudioJson(validateGlobalTemplateLibrary({ ...globalLibrary, templates: templates.store }), "acm-global-template-draft.json")}>Export Unsaved Global Draft</button> : null}<button type="button" onClick={() => void templates.resolveSyncConflict("theirs")}>Use Other Change</button><button type="button" onClick={() => void templates.resolveSyncConflict("mine")}>Use My Change</button></div></div> : null}
    {!templates.syncConflict && (templates.error || feedback || media.error) ? <div className="template-status template-inline-status" role="alert"><span>{templates.error ?? feedback ?? media.error}</span>{editingScope === "global" ? <div className="template-status-actions"><button type="button" onClick={() => exportStudioJson(globalLibrary ? validateGlobalTemplateLibrary({ ...globalLibrary, templates: templates.store }) : templates.store, "acm-global-template-draft.json")}>Export Unsaved Global Draft</button><button type="button" onClick={templates.retryConnection}>Reload Global Originals</button></div> : !templates.ready ? <div className="template-status-actions"><button type="button" onClick={() => exportStudioJson({ raw: window.localStorage.getItem(TEMPLATE_STORAGE_KEY) }, "acm-template-recovery.json", 1000)}>Export Original Data</button></div> : null}</div> : null}
    <StudioNavigationFrame width={resolvedLibraryPaneWidth} collapsed={resolvedLibraryPaneCollapsed}
      onWidthChange={setResolvedLibraryPaneWidth} onCollapsedChange={setResolvedLibraryPaneCollapsed}
      selectedSite={siteId} onSelectSite={onSelectSite} onSelectWorkspace={onSelectWorkspace ?? onBackToContent}
      libraryKind={libraryKind} onSelectLibraryKind={onSelectLibraryKind}
      counts={{ post: workspace.workspace.documents.filter(item => item.kind === "post").length,
        page: workspace.workspace.documents.filter(item => item.kind === "page").length, templates: templateEntryCount }}
      binCount={workspace.workspace.bin.length + templates.store.bin.length} studioSection="templates"
      writable={contentWritable ?? workspace.writable} templateWritable={contentTemplateWritable ?? templates.writable}
      onNewDocument={onNewDocument} onNewFromTemplate={onNewFromTemplate}
      onOpenFiles={onOpenFiles} onOpenBackup={onOpenBackup} onOpenBin={onOpenBin} onExportContent={onExportContent}>
      {libraryKind === "templates" ? <TemplateCreationActions writable={writable} onCreate={addTarget} /> : null}
      <div className="document-list template-document-list" {...reordering.listProps}>
        <DragPlacementIndicator line={reordering.line} />
        {libraryKind === "templates" ? <>
        {templateEntries.map(({ set: item, entry }) => <button {...reordering.rowProps(`${item.id}/${entry.id}`)} className={`document-item template-target-item${!showTemplateLibrary && item.id === set?.id && entry.id === target?.id ? " is-active" : ""}`} type="button" key={`${item.id}/${entry.id}`} data-template-target={`${item.id}/${entry.id}`} aria-haspopup="menu" aria-expanded={templateContextMenu?.setId === item.id && templateContextMenu.targetId === entry.id} onClick={() => openSet(item, entry.id)} onContextMenu={(event) => { event.preventDefault(); templateContextMenuTriggerRef.current = event.currentTarget; openSet(item, entry.id); setTemplateContextMenu({ setId: item.id, targetId: entry.id, label: entry.name, x: event.clientX, y: event.clientY }); }} onKeyDown={(event) => { reordering.rowProps(`${item.id}/${entry.id}`).onKeyDown(event); if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) { event.preventDefault(); templateContextMenuTriggerRef.current = event.currentTarget; const rect = event.currentTarget.getBoundingClientRect(); openSet(item, entry.id); setTemplateContextMenu({ setId: item.id, targetId: entry.id, label: entry.name, x: rect.left + 12, y: rect.bottom - 4 }); } }}>
          <span className="document-kind-mark" aria-hidden="true">{templateNameInitial(entry.name)}</span><span><strong>{entry.name}</strong><small>{entry.kind === "header" || entry.kind === "footer" || entry.kind === "overlay" ? `Shared ${entry.kind}` : `${entry.kind} template`}</small></span><i aria-hidden="true" />
          <LibraryDragHandle enabled={reordering.canReorder} />
        </button>)}

        </> : workspace.workspace.documents.filter(document => document.kind === libraryKind).map(document => <button {...reordering.rowProps(document.id)} className={`document-item${document.id === workspace.workspace.activeDocumentId ? " is-active" : ""}`} type="button" key={document.id} onClick={() => onSelectDocument?.(document.id)}>
          <span className="document-kind-mark">{document.kind === "page" ? "P" : "A"}</span><span><strong>{document.title}</strong><small>/{document.slug}</small></span><span className={`document-status is-${document.status}`}>{document.status.charAt(0).toUpperCase() + document.status.slice(1)}</span>
          <LibraryDragHandle enabled={reordering.canReorder} />
        </button>)}
        {libraryKind !== "templates" && !workspace.workspace.documents.some(document => document.kind === libraryKind) ? <p className="document-list-empty">No {libraryKind === "page" ? "pages" : "posts"} yet.</p> : null}
        <span className="visually-hidden" role="status">{reordering.message}</span>
      </div>
    </StudioNavigationFrame>

    {siteNavigationEditor ? siteNavigationEditor : mediaTarget ? <section className="template-library" style={{ gridColumn: "span 2" }}>{scopeNotice}<button type="button" onClick={() => setMediaTarget(null)}>Back to Template</button><MediaManager writable={writable} targetOwnerId={`${mediaTarget.setId}/${mediaTarget.targetId}/${mediaTarget.blockId}`} targetLabel={mediaTarget.logo ? "Site logo" : mediaTarget.background ? "Background image" : "Template image"} targetKind={templateMediaTargetKind(target?.nodes ?? [], mediaTarget)} onInsertImage={insertMedia} /></section> : !showTemplateLibrary && set && target ? <TemplateEditor canChooseFixedImage={!siteId} viewControls={viewControls} scopeNotice={scopeNotice} previewControls={previewControls} globalOriginal={editingScope === "global"} siteId={siteId} fixtureLinks={Boolean(siteId)} initialSelectedBlockId={editingScope === "global" && set.id === "studio-global-navigation" ? target.nodes[0]?.id : target.kind === "overlay" ? target.nodes[0]?.id : siteNavigation?.setId === set.id && siteNavigation.partId === target.id ? target.nodes.find(node => node.type === "element" && node.element === "navigation")?.id : undefined} siteNavigationPartId={siteNavigation?.setId === set.id ? siteNavigation.partId : undefined} sharedSiteNavigation={siteNavigation?.setId === set.id && siteNavigation.partId === target.id} key={`${set.id}/${target.id}`} set={editorSet ?? set} target={target} documents={preview?.documents ?? workspace.workspace.documents} mediaUrls={media.urls} loadInlineImages={loadStoredInlineImages} writable={writable} onChange={changeSet} onEditPart={(id, nextSet) => openSet(nextSet ?? set, id)} onOpenMedia={(blockId, logo = false, background = false, item) => { if (siteId) { setFeedback(`${localFixtureName(siteId ?? "test")} templates use portable image URLs. Browser-managed files remain in Studio Drafts.`); return; } setMediaTarget({ blockId, logo, background, item, targetId: target.id, setId: set.id }); }} inspectorTab={inspectorTab} onInspectorTabChange={onInspectorTabChange} inspectorPaneWidth={resolvedInspectorPaneWidth} onInspectorPaneWidthChange={setResolvedInspectorPaneWidth} inspectorPaneCollapsed={resolvedInspectorPaneCollapsed} onInspectorPaneCollapsedChange={setResolvedInspectorPaneCollapsed} undo={templates.undo} redo={templates.redo} canUndo={templates.canUndo} canRedo={templates.canRedo} /> : <section className="template-library" style={{ gridColumn: "span 2" }}>{scopeNotice}<h1>Templates</h1><p>Reusable global originals and shared parts.</p><div className="template-library-actions"><TemplateCreationActions writable={writable} onCreate={addTarget} importWritable={exclusiveWritable} onImport={() => importRef.current?.click()} /></div>
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
  return <>{panel}{dialogElement}</>;
}
