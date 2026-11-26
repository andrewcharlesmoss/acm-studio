"use client";
import { BinFeedback, BinItem, BinList, BinRestoreButton } from "./bin-presentation";
import { restoreGlobalTemplate } from "./global-template-bin";
import { localFixtureName, localFixtureSites, type LocalFixtureSiteId } from "./test-site/sites";
import { SelectControl } from "./controls/native-fields";
import { HistoryActions } from "./controls/history-actions";
import { studioHistoryShortcut } from "./studio-history-shortcuts.mjs";
import { useLibraryPreviewFiles, type MotionBinFile } from "./media-library-preview";
import { changeLibraryFile } from "./media-sync";
import { changePreset, readCatalogue, useMotionCatalogueSource, type PresetPreferences } from "./motion-assets/catalogue-recovery";
import { motionCatalogue } from "./motion-assets/motion-catalogue";
import { motionEffectCatalogue } from "./motion-assets/motion-effects";

import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import type { useStudioWorkspace } from "./use-studio-workspace";
import type { useTemplates } from "./use-templates";
import { StudioDialog, StudioDialogActions } from "./overlays/dialog";
import { StudioButton } from "./controls/button";
import { StudioIcon } from "./studio-icons";
import { restoreLocallyPublishedArticle } from "../content/local-publishing";
import { copyTemplateData, visitTemplateNodes, templatePartReference } from "./template-model";
import type { StudioWorkspace, StudioBinnedDocument } from "./editor-model";
import type { TemplateStore, StudioBinnedTemplate } from "./template-model";
import { restoreFixtureDocumentsFromBin } from "./document-bin-commands.mjs";

type WorkspaceSession = ReturnType<typeof useStudioWorkspace>;
type TemplateSession = ReturnType<typeof useTemplates>;
type BinTarget = { id: string; label: string; kind: "document" | "template" | "set" };

function formattedDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

const binTypes = [
  { id: "all", label: "All items" },
  { id: "pages", label: "Pages" },
  { id: "posts", label: "Posts" },
  { id: "templates", label: "Templates" },
  { id: "motion-assets", label: "Motion Assets" },
] as const;
type BinType = typeof binTypes[number]["id"];
const locations = ["Studio Drafts", ...localFixtureSites.map(site => site.name), "Global templates", "Motion Assets"].sort();
export type BinSource = {
  id: LocalFixtureSiteId | null;
  documents?: readonly StudioBinnedDocument[];
  templates?: readonly StudioBinnedTemplate[];
  error?: string | null;
};
type BinRow = {
  key: string;
  label: string;
  description: string;
  mark: string;
  type: Exclude<BinType, "all">;
  location: string;
  deletedAt?: string;
  permanentTarget?: BinTarget;
} & ({ restore: () => void; canRestore: boolean; recoveryHref?: never }
  | { restore?: never; canRestore?: never; recoveryHref: string });
type MotionRestore = {
  label: string;
  generation?: string;
  undo: () => Promise<unknown>;
  redo: () => Promise<unknown>;
};

const presetNames = [...motionEffectCatalogue, ...motionCatalogue].map(asset => asset.name);
const templateType = (item: StudioBinnedTemplate) => item.kind === "set" ? "Template set"
  : item.entry.kind === "page" ? "Page template" : item.entry.kind === "post" ? "Post template" : `Shared ${item.entry.kind}`;

function binHref(siteId: LocalFixtureSiteId | null, type: BinType, location: string) {
  const query = new URLSearchParams({ mode: "bin" });
  if (siteId) query.set("site", siteId);
  if (type !== "all") query.set("binType", type);
  if (location) query.set("binLocation", location);
  return `/studio?${query}`;
}

const binSourceName = ({ id }: BinSource) => id ? localFixtureName(id) : "Studio Drafts";

export function StudioBin({ globals, workspace, templates, currentSource, otherSources, siteId, commitContent, templateRecoveryOnly = false, initialType, initialLocation, navigationError }: {
  globals?: TemplateSession;
  workspace: WorkspaceSession;
  templates: TemplateSession;
  currentSource: BinSource;
  otherSources: readonly BinSource[];
  siteId?: LocalFixtureSiteId;
  templateRecoveryOnly?: boolean;
  initialType?: string;
  initialLocation?: string;
  navigationError?: string | null;
  commitContent?: (update: (workspace: StudioWorkspace, templates: TemplateStore) => { workspace: StudioWorkspace; templates: TemplateStore }) => boolean;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [permanentTarget, setPermanentTarget] = useState<BinTarget | null>(null);
  const [type, setType] = useState<BinType>(() => {
    const requestedType = typeof window === "undefined" ? initialType : new URLSearchParams(window.location.search).get("binType");
    return binTypes.find(item => item.id === requestedType)?.id ?? "all";
  });
  const [location, setLocation] = useState(() => {
    const requestedLocation = typeof window === "undefined" ? initialLocation : new URLSearchParams(window.location.search).get("binLocation");
    return requestedLocation && locations.includes(requestedLocation) ? requestedLocation : "";
  });
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [historyOwner, setHistoryOwner] = useState<"motion" | "global">("motion");
  const [history, setHistory] = useState<{ past: MotionRestore[]; future: MotionRestore[] }>({ past: [], future: [] });
  const openerRef = useRef<HTMLElement | null>(null);
  const historyControls = useRef<HTMLDivElement | null>(null);
  const writable = workspace.writable && templates.writable;
  const { binFiles, generation, loaded: mediaLoaded, unavailable } = useLibraryPreviewFiles("video");
  const catalogueSource = useMotionCatalogueSource();
  let presets: PresetPreferences = {};
  let presetLoadError = "";
  try { presets = readCatalogue(catalogueSource).values; }
  catch (error) { presetLoadError = error instanceof Error ? error.message : "Deleted motion presets couldn’t be loaded."; }
  const available = (step: MotionRestore) => !step.generation || step.generation === generation;
  const undoStep = history.past.filter(available).at(-1);
  const redoStep = history.future.filter(available).at(-1);
  const useGlobals = historyOwner === "global" && type !== "motion-assets";
  const canUndo = useGlobals ? Boolean(globals?.writable && globals.canUndo) : Boolean(undoStep);
  const canRedo = useGlobals ? Boolean(globals?.writable && globals.canRedo) : Boolean(redoStep);

  async function runOwned(command: () => Promise<string>) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      setFeedback(await command());
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "The Bin change could not be confirmed. Reload before retrying.");
    } finally {
      saving.current = false;
      setBusy(false);
      requestAnimationFrame(() => {
        if (document.activeElement === document.body) historyControls.current?.focus({ preventScroll: true });
      });
    }
  }

  function restoreMotion(step: MotionRestore, restore = step.redo) {
    void runOwned(async () => {
      await restore();
      setHistory(current => ({ past: [...current.past.filter(available), step].slice(-30), future: [] }));
      setHistoryOwner("motion");
      return `“${step.label}” restored.`;
    });
  }

  function restoreVideo({ id, name, sourceFolderId, binFolderId, updatedAt }: MotionBinFile) {
    const move = (toBin: boolean, timestamp?: string) => changeLibraryFile({
      kind: "move-motion-video", id, name, sourceFolderId, binFolderId, toBin,
      ...(timestamp ? { updatedAt: timestamp } : {}),
    }, generation);
    restoreMotion({ label: name, generation: generation ?? undefined, undo: () => move(true), redo: () => move(false) },
      () => move(false, updatedAt));
  }

  function changeHistory(direction: "undo" | "redo", global = useGlobals) {
    if (busy || permanentTarget) return;
    if (global) {
      if (globals?.writable && (direction === "undo" ? globals.canUndo : globals.canRedo)) globals[direction]();
      return;
    }
    const step = direction === "undo" ? undoStep : redoStep;
    if (!step) return;
    void runOwned(async () => {
      await step[direction]();
      setHistory(current => direction === "undo"
        ? { past: current.past.filter(item => available(item) && item !== step), future: [...current.future.filter(available), step] }
        : { past: [...current.past.filter(available), step], future: current.future.filter(item => available(item) && item !== step) });
      setHistoryOwner("motion");
      return direction === "undo" ? `“${step.label}” moved back to the Bin.` : `“${step.label}” restored.`;
    });
  }

  function handleHistoryShortcut(event: KeyboardEvent<HTMLElement>) {
    if (busy || permanentTarget || !(event.target instanceof HTMLElement) || !event.currentTarget.contains(event.target)) return;
    const direction = studioHistoryShortcut(event.nativeEvent, navigator.platform);
    if (!direction) return;
    const global = useGlobals && !event.target.closest("[data-motion-bin-action]");
    const availableAction = global
      ? globals?.writable && (direction === "undo" ? globals.canUndo : globals.canRedo)
      : direction === "undo" ? undoStep : redoStep;
    if (!availableAction) return;
    event.preventDefault();
    changeHistory(direction, global);
  }

  function closePermanentDialog() { setPermanentTarget(null); }

  function askPermanentDelete(event: MouseEvent<HTMLButtonElement>, target: BinTarget) {
    openerRef.current = event.currentTarget;
    setPermanentTarget(target);
  }

  function restoreDocument(item: StudioBinnedDocument) {
    if (workspace.workspace.documents.some(document => document.id === item.document.id)) {
      setFeedback("A document with this ID already exists. The binned copy has been kept.");
      return;
    }
    if (item.assignment && !templates.store.sets.some(set => set.id === item.assignment!.setId && set.templates.some(template => template.id === item.assignment!.templateId && template.kind === item.assignment!.kind))) {
      setFeedback(templateRecoveryOnly ? "This deleted document uses a recovery template that is unavailable in the shared library. Export a Backup for manual recovery. Its content and original assignment remain in the Bin." : "Restore the template assigned to this document before restoring the document.");
      return;
    }
    if (commitContent) {
      let problem = "";
      const restored = commitContent((current, store) => {
        try { const result = restoreFixtureDocumentsFromBin(current, store, [item.id]); return { workspace: result.workspace, templates: result.templates }; }
        catch (error) { problem = error instanceof Error ? error.message : "The document could not be restored."; throw error; }
      });
      setFeedback(restored ? `${item.document.kind === "page" ? "Page" : "Post"} restored.` : problem || "This document could not be restored. It remains in the Bin.");
      return;
    }
    const saved = workspace.commit(current => ({ ...current, bin: current.bin.filter(candidate => candidate.id !== item.id), documents: [...current.documents, item.document], activeDocumentId: item.document.id }));
    if (!saved) { setFeedback("This document could not be restored because the workspace could not be saved."); return; }
    if (item.assignment && !templates.commit(current => ({ ...current, assignments: [...current.assignments.filter(assignment => assignment.documentId !== item.document.id), item.assignment!] }))) {
      workspace.commit(current => ({ ...current, documents: current.documents.filter(document => document.id !== item.document.id), bin: [...current.bin, item] }));
      setFeedback("The document was put back in the Bin because its template assignment could not be restored.");
      return;
    }
    if (item.publication && !siteId) {
      try { restoreLocallyPublishedArticle(item.publication); }
      catch (error) {
        if (item.assignment) templates.commit(current => ({ ...current, assignments: current.assignments.filter(assignment => assignment.documentId !== item.document.id) }));
        workspace.commit(current => ({ ...current, documents: current.documents.filter(document => document.id !== item.document.id), bin: [...current.bin, item] }));
        setFeedback(error instanceof Error ? error.message : "The published copy could not be restored. The document remains in the Bin.");
        return;
      }
    }
    setFeedback(`${item.document.kind === "page" ? "Page" : "Post"} restored.`);
  }

  function restoreTemplate(item: StudioBinnedTemplate) {
    if (templateRecoveryOnly) { setFeedback("This browser template is a recovery copy. Export a Backup for manual recovery of its design. The original remains in the Bin."); return; }
    if (item.kind === "set") {
      if (templates.store.sets.some(set => set.id === item.set.id)) { setFeedback("A template set with this ID already exists. The binned copy has been kept."); return; }
      if (templates.commit(current => ({ ...current, bin: current.bin.filter(candidate => candidate.id !== item.id), sets: [...current.sets, copyTemplateData(item.set)] }))) setFeedback("Template set restored.");
      else setFeedback("The template set could not be restored.");
      return;
    }
    const set = templates.store.sets.find(candidate => candidate.id === item.setId);
    if (!set) { setFeedback("Restore or permanently delete the template set before restoring this item."); return; }
    if ([...set.templates, ...set.parts].some(entry => entry.id === item.entry.id)) { setFeedback("An item with this ID already exists in the template set. The binned copy has been kept."); return; }
    const referencedPartIds = new Set<string>();
    const pendingPartIds: string[] = [];
    const collectPartReferences = (nodes: typeof item.entry.nodes) => visitTemplateNodes(nodes, node => { const id = templatePartReference(node); if (id && !referencedPartIds.has(id)) { referencedPartIds.add(id); pendingPartIds.push(id); } });
    collectPartReferences(item.entry.nodes);
    while (pendingPartIds.length) {
      const partId = pendingPartIds.pop()!;
      const part = item.setSnapshot.parts.find(candidate => candidate.id === partId);
      if (part) collectPartReferences(part.nodes);
    }
    const additions = item.setSnapshot.parts.filter(part => referencedPartIds.has(part.id) && !set.parts.some(existing => existing.id === part.id));
    const saved = templates.commit(current => ({
      ...current,
      bin: current.bin.filter(candidate => candidate.id !== item.id && !(candidate.kind === "template" && additions.some(part => part.id === candidate.entry.id))),
      sets: current.sets.map(candidate => candidate.id !== set.id ? candidate : {
        ...candidate,
        templates: item.entry.kind === "page" || item.entry.kind === "post" ? [...candidate.templates, copyTemplateData(item.entry) as typeof candidate.templates[number]] : candidate.templates,
        parts: item.entry.kind === "header" || item.entry.kind === "footer" || item.entry.kind === "overlay" ? [...candidate.parts, copyTemplateData(item.entry) as typeof candidate.parts[number], ...copyTemplateData(additions)] : [...candidate.parts, ...copyTemplateData(additions)],
      }),
    }));
    setFeedback(saved ? "Template restored." : "The template could not be restored.");
  }

  function permanentlyDelete(target: BinTarget) {
    if (target.kind === "document") {
      const item = workspace.workspace.bin.find(candidate => candidate.id === target.id);
      if (!item) return;
      if (workspace.workspace.documents.some(document => document.parentPageId === item.document.id)
        || workspace.workspace.bin.some(candidate => candidate.id !== item.id && candidate.document.parentPageId === item.document.id)) {
        setFeedback("Reassign or restore this page’s child pages before permanently deleting it.");
        return;
      }
      if (!workspace.commit(current => ({ ...current, bin: current.bin.filter(candidate => candidate.id !== item.id) }))) { setFeedback("The item could not be permanently deleted because the workspace could not be saved."); return; }
    } else {
      const template = templates.store.bin.find(item => item.id === target.id);
      if (template?.kind === "set" && workspace.workspace.bin.some(item => item.assignment?.setId === template.set.id)) {
        setFeedback("Restore or permanently delete the binned documents assigned to this template set first.");
        return;
      }
      if (template?.kind === "template" && workspace.workspace.bin.some(item => item.assignment?.setId === template.setId && item.assignment.templateId === template.entry.id)) {
        setFeedback("Restore or permanently delete the binned documents assigned to this template first.");
        return;
      }
      if (!templates.commit(current => ({ ...current, bin: current.bin.filter(item => item.id !== target.id) }))) { setFeedback("The item could not be permanently deleted because templates could not be saved."); return; }
    }
    setFeedback(`${target.label} permanently deleted.`);
    closePermanentDialog();
  }

  const currentSite = siteId ?? null;
  const sources = [currentSource, ...otherSources];
  const relevantSources = sources.filter(source => !location || location === binSourceName(source));
  const entries: BinRow[] = [
    ...sources.flatMap(source => {
      const sourceLocation = binSourceName(source);
      const owner = source.id === currentSite;
      return [
        ...(source.documents ?? []).map((item): BinRow => {
          const page = item.document.kind === "page";
          const rowType = page ? "pages" : "posts";
          return {
            key: `document/${source.id ?? "drafts"}/${item.id}`, label: item.document.title, description: page ? "Page" : "Post",
            mark: page ? "P" : "A", type: rowType, location: sourceLocation, deletedAt: item.deletedAt,
            ...(owner ? { restore: () => restoreDocument(item), canRestore: writable,
              permanentTarget: { id: item.id, label: item.document.title, kind: "document" } }
              : { recoveryHref: binHref(source.id, type, location || sourceLocation) }),
          };
        }),
        ...(source.templates ?? []).map((item): BinRow => {
          const label = item.kind === "set" ? item.set.name : item.entry.name;
          return {
            key: `local-template/${source.id ?? "drafts"}/${item.id}`, label, description: templateType(item), mark: item.kind === "set" ? "S" : "T",
            type: "templates", location: sourceLocation, deletedAt: item.deletedAt,
            ...(owner ? { restore: () => restoreTemplate(item), canRestore: writable,
              permanentTarget: { id: item.id, label, kind: item.kind } }
              : { recoveryHref: binHref(source.id, type, location || sourceLocation) }),
          };
        }),
      ];
    }),
    ...(globals ? globals.store.bin.flatMap((item): BinRow[] => {
      if (item.kind !== "template") return [];
      return [{
        key: `global-template/${item.id}`, label: item.entry.name, description: templateType(item),
        mark: "T", type: "templates", location: "Global templates", deletedAt: item.deletedAt,
        canRestore: globals.writable && !busy,
        restore: () => void runOwned(async () => {
          if (!globals.commit(store => restoreGlobalTemplate(store, item.id))) throw new Error("The template could not be restored. Its recovery copy was kept.");
          await globals.flush?.();
          setHistoryOwner("global");
          return "Global template restored.";
        }),
      }];
    }) : []),
    ...presetNames.flatMap((key): BinRow[] => {
      const preset = presets[key];
      if (!preset?.hidden) return [];
      const label = preset.name ?? key;
      const restored = preset.name === undefined ? {} : { name: preset.name };
      return [{
        key: `motion-preset/${key}`, label, description: "Built-in preset",
        mark: "M", type: "motion-assets", location: "Motion Assets", deletedAt: preset.deletedAt,
        canRestore: !busy, restore: () => restoreMotion({
          label, undo: () => changePreset(key, restored, preset), redo: () => changePreset(key, preset, restored),
        }),
      }];
    }),
    ...binFiles.map((file): BinRow => ({
      key: `motion-video/${file.id}`, label: file.name, description: "Imported video",
      mark: "M", type: "motion-assets", location: "Motion Assets", deletedAt: file.deletedAt,
      canRestore: Boolean(generation) && !busy, restore: () => restoreVideo(file),
    })),
  ];
  const visible = entries.filter(entry => (type === "all" || type === entry.type) && (!location || location === entry.location))
    .sort((left, right) => (right.deletedAt ? Date.parse(right.deletedAt) : 0) - (left.deletedAt ? Date.parse(left.deletedAt) : 0)
      || left.label.localeCompare(right.label));
  const needsDocuments = type === "all" || type === "pages" || type === "posts";
  const needsTemplates = type === "all" || type === "templates";
  const showGlobals = needsTemplates && (!location || location === "Global templates");
  const showMotion = (type === "all" || type === "motion-assets") && (!location || location === "Motion Assets");
  const unavailableSources = relevantSources.filter(source => source.error && (needsDocuments || needsTemplates));
  const loadingSources: string[] = relevantSources
    .filter(source => !source.error && (needsDocuments && !source.documents || needsTemplates && !source.templates))
    .map(binSourceName);
  if (showGlobals && globals && !globals.ready && !globals.error) loadingSources.push("Global templates");
  if (showMotion && !mediaLoaded && !unavailable) loadingSources.push("Motion Assets");
  const globalError = showGlobals ? globals?.error : null;
  const motionError = showMotion ? presetLoadError || (unavailable ? "Deleted videos couldn’t be loaded from Files." : "") : null;
  const missingSource = unavailableSources.length > 0 || Boolean(globalError || motionError);

  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Scope platform history shortcuts to focused controls in the Bin.
  return <section className="studio-bin" aria-labelledby="studio-bin-title" onKeyDown={handleHistoryShortcut}>
    <header><h1 id="studio-bin-title">Bin</h1><span>{visible.length} {visible.length === 1 ? "item" : "items"}</span></header>
    <div className="studio-bin-filters">
      <div><label htmlFor="studio-bin-type">Type</label><SelectControl id="studio-bin-type" value={type} onChange={event => setType(event.target.value as BinType)}>
        {binTypes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
      </SelectControl></div>
      <div><label htmlFor="studio-bin-location">Original Location</label><SelectControl id="studio-bin-location" value={location} onChange={event => setLocation(event.target.value)}>
        <option value="">All locations</option>
        {locations.map(item => <option key={item} value={item}>{item}</option>)}
      </SelectControl></div>
      <div className="studio-bin-history" role="group" aria-label="Bin history" ref={historyControls} tabIndex={-1}>
        <HistoryActions presentation="labelled" canUndo={canUndo} canRedo={canRedo} disabled={busy}
          onUndo={() => changeHistory("undo")} onRedo={() => changeHistory("redo")}
          undoLabel={useGlobals ? undefined : "Undo Restore"} redoLabel={useGlobals ? undefined : "Redo Restore"} />
      </div>
    </div>
    <BinFeedback>{feedback}</BinFeedback>
    {navigationError ? <p className="studio-bin-status" role="alert">{navigationError}</p> : null}
    {unavailableSources.map(source => <p className="studio-bin-status" key={source.id ?? "drafts"} role="alert">
      {binSourceName(source)} items may be incomplete. {source.error}
    </p>)}
    {loadingSources.length ? <p className="studio-bin-status" role="status">Loading deleted items from {new Intl.ListFormat("en-GB").format(loadingSources)}…</p> : null}
    {globalError ? <p className="studio-bin-status" role="alert">{globalError}</p> : null}
    {motionError ? <p className="studio-bin-status" role="alert">{motionError}</p> : null}
    <BinList hasItems={visible.length > 0} emptyMessage={loadingSources.length ? "" : missingSource ? "No deleted items could be shown for these filters." : type !== "all" || location ? "No deleted items match these filters." : "The Bin is empty."}>
      {visible.map(entry => <BinItem key={entry.key} mark={entry.mark} label={entry.label}
        detail={`${entry.description} · ${entry.location}${entry.deletedAt ? ` · Deleted ${formattedDate(entry.deletedAt)}` : ""}`}>
        {entry.recoveryHref ? <a className="button-secondary" data-studio-departure-link href={entry.recoveryHref}>
          Open {entry.location} to restore
        </a> : <BinRestoreButton disabled={busy || !entry.canRestore} onClick={entry.restore}
          data-motion-bin-action={entry.type === "motion-assets" ? "" : undefined} />}
        {entry.permanentTarget && <button className="danger-button" type="button" disabled={!writable}
          onClick={event => askPermanentDelete(event, entry.permanentTarget!)}><StudioIcon name="trash" size={16} />Delete permanently</button>}
      </BinItem>)}
    </BinList>
    {permanentTarget ? <StudioDialog title="Delete permanently?" className="template-dialog" returnFocus={openerRef} onClose={closePermanentDialog}>
      <p>This will permanently delete “{permanentTarget.label}”. You won’t be able to restore it.</p>
      <StudioDialogActions><StudioButton variant="secondary" type="button" onClick={closePermanentDialog}>Cancel</StudioButton><button className="button-primary danger-button" type="button" disabled={!writable} onClick={() => permanentlyDelete(permanentTarget)}>Delete permanently</button></StudioDialogActions>
    </StudioDialog> : null}
  </section>;
}
