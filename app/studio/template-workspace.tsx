"use client";
import { useEffect, useRef, useState } from "react";
import { useStudioWorkspace } from "./use-studio-workspace";
import { useTemplates } from "./use-templates";
import { useStudioHistoryShortcuts } from "./use-studio-history-shortcuts";
import { TemplateEditor } from "./template-editor";
import { MediaManager } from "./media-manager";
import { StudioIcon } from "./studio-icons";
import { createTemplateSet, copyTemplateData, templateId, templateMediaIds, visitTemplateNodes, TEMPLATE_STORAGE_KEY, type TemplateSet, type PageTemplate, type TemplatePart } from "./template-model";
import { exportTemplatePackage, importTemplatePackage, TEMPLATE_PACKAGE_LIMIT, validateTemplatePackage } from "./template-package";
import { contentMediaIds, useTemplateMedia } from "./use-template-media";
import type { MediaAsset } from "./media-store";
import { studioWriteOwnership } from "./write-ownership";

type NameDialog = { title: string; name: string; confirm: (name: string) => boolean | void };
function download(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function TemplateWorkspace() {
  const workspace = useStudioWorkspace();
  const templates = useTemplates(workspace.ownershipGeneration, workspace.writable);
  const [setId, setSetId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<{ blockId: string | null; logo: boolean } | null>(null);
  const [dialog, setDialog] = useState<NameDialog | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const set = templates.store.sets.find(item => item.id === setId);
  const target = set ? [...set.templates, ...set.parts].find(item => item.id === targetId) ?? set.templates[0] : undefined;
  const media = useTemplateMedia([...(set ? templateMediaIds(set) : []), ...workspace.workspace.documents.flatMap(document => [...contentMediaIds(document.blocks), ...(document.coverImage?.mediaId ? [document.coverImage.mediaId] : [])])]);
  const writable = templates.writable && !busy;
  useStudioHistoryShortcuts(templates.undo, templates.redo, writable && !dialog);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    queueMicrotask(() => { setSetId(query.get("set")); setTargetId(query.get("target")); });
  }, []);
  const dialogOpen = dialog !== null;
  useEffect(() => {
    if (!dialogOpen || !dialogRef.current) return;
    dialogRef.current.showModal(); dialogRef.current.querySelector<HTMLInputElement>("input")?.select();
  }, [dialogOpen]);
  function closeDialog() { dialogRef.current?.close(); setDialog(null); openerRef.current?.focus(); }
  function askName(title: string, name: string, confirm: NameDialog["confirm"]) { openerRef.current = document.activeElement as HTMLElement; setDialog({ title, name, confirm }); }
  function openSet(item: TemplateSet, id = item.templates[0]?.id) {
    setSetId(item.id); setTargetId(id ?? null); setMediaTarget(null);
    window.history.replaceState({}, "", `/studio/templates?set=${encodeURIComponent(item.id)}&target=${encodeURIComponent(id ?? "")}`);
  }
  function library() { setSetId(null); setTargetId(null); setMediaTarget(null); window.history.replaceState({}, "", "/studio/templates"); }
  function changeSet(next: TemplateSet) { return templates.commit(store => ({ ...store, sets: store.sets.map(item => item.id === next.id ? next : item) })); }
  function uniqueName(base: string) { let name = base; let suffix = 2; while (templates.store.sets.some(item => item.name === name)) name = `${base} ${suffix++}`; return name; }
  async function exportSet(item: TemplateSet) {
    setBusy(true); setFeedback(null);
    try { download(await exportTemplatePackage(item), `${item.name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase() || "template"}.json`); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "Export failed."); }
    finally { setBusy(false); }
  }
  async function duplicateSet(item: TemplateSet) {
    setBusy(true); setFeedback(null);
    try { const token = studioWriteOwnership.captureWriteToken(); const id = await importTemplatePackage(await exportTemplatePackage(item), uniqueName(`${item.name} Copy`), token); window.location.assign(`/studio/templates?set=${encodeURIComponent(id)}`); }
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
      window.location.assign(`/studio/templates?set=${encodeURIComponent(id)}`);
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Import failed."); setBusy(false); }
  }
  function deleteSet(item: TemplateSet) {
    if (templates.store.assignments.some(a => a.setId === item.id)) { setFeedback("Reassign documents before deleting this template set."); return; }
    askName(`Delete ${item.name}`, "", () => templates.commit(store => ({ ...store, sets: store.sets.filter(candidate => candidate.id !== item.id) })));
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
  function duplicateTarget() {
    if (!set || !target) return;
    const copy = copyTemplateData(target); copy.id = templateId(); copy.name = `${copy.name} Copy`; visitTemplateNodes(copy.nodes, node => { node.id = templateId(); });
    const next = copy.kind === "page" || copy.kind === "post" ? { ...set, templates: [...set.templates, copy as PageTemplate] } : { ...set, parts: [...set.parts, copy as TemplatePart] };
    if (changeSet(next)) setTargetId(copy.id);
  }
  function deleteTarget() {
    if (!set || !target) return;
    const used = templates.store.assignments.some(a => a.setId === set.id && a.templateId === target.id);
    let referenced = false;
    [...set.templates, ...set.parts].forEach(item => visitTemplateNodes(item.nodes, node => { if (node.type === "part" && node.partId === target.id) referenced = true; }));
    if (used || referenced) { setFeedback("Reassign this template or replace its shared-part references before deleting it."); return; }
    askName(`Delete ${target.name}`, "", () => {
      const saved = templates.commit(store => ({ ...store, sets: store.sets.map(item => item.id === set.id ? { ...item, templates: item.templates.filter(t => t.id !== target.id), parts: item.parts.filter(p => p.id !== target.id) } : item) }));
      if (saved) setTargetId(null); return saved;
    });
  }
  function insertMedia(asset: MediaAsset, _destination?: unknown, altText?: string) {
    if (!set || !target || !mediaTarget || !writable) return;
    if (mediaTarget.logo) changeSet({ ...set, identity: { ...set.identity, logo: { src: "", mediaId: asset.id, alt: altText || asset.altText || asset.name } } });
    else {
      const nodes = copyTemplateData(target.nodes);
      let found = false;
      visitTemplateNodes(nodes, node => { if (node.id === mediaTarget.blockId && node.type === "image") { node.mediaId = asset.id; node.src = ""; node.alt = altText || asset.altText || asset.name; found = true; } });
      if (!found) nodes.push({ id: templateId(), type: "image", src: "", mediaId: asset.id, alt: altText || asset.altText || asset.name, caption: asset.caption });
      changeSet({ ...set, templates: set.templates.map(item => item.id === target.id ? { ...item, nodes } : item), parts: set.parts.map(item => item.id === target.id ? { ...item, nodes } : item) });
    }
    setMediaTarget(null);
  }
  return <div className="studio-shell template-shell">
    <header className="studio-header"><a className="studio-brand" href="/"><span>AM</span><strong>ACM Studio</strong></a><div className="studio-breadcrumbs"><button type="button" className="text-button" onClick={library}>Templates</button>{set ? <><StudioIcon name="chevron-right" size={14} /><span>{set.name}</span><StudioIcon name="chevron-right" size={14} /><strong>{target?.name ?? "Choose a template"}</strong></> : null}</div><div className="studio-state"><span className="prototype-pill">Local prototype</span><span role="status">{workspace.writable ? templates.saveLabel : workspace.saveLabel}</span>{workspace.canRetryEditing ? <button type="button" onClick={workspace.retryEditing}>Try Editing Here</button> : null}</div><div className="studio-actions">{!set || !target || mediaTarget ? <><button type="button" className="icon-button" aria-label="Undo" disabled={!writable || !templates.canUndo} onClick={templates.undo}><StudioIcon name="undo" /></button><button type="button" className="icon-button" aria-label="Redo" disabled={!writable || !templates.canRedo} onClick={templates.redo}><StudioIcon name="redo" /></button></> : null}<a className="button-secondary" href="/studio">Pages and Posts</a></div></header>
    <div className="studio-notice">Templates and media remain in this browser. Export a package or full backup to keep a copy.</div>
    {templates.error || feedback || media.error ? <div className="template-status" role="alert">{templates.error ?? feedback ?? media.error}{!templates.ready ? <button type="button" onClick={() => download({ raw: window.localStorage.getItem(TEMPLATE_STORAGE_KEY) }, "acm-template-recovery.json")}>Export Original Data</button> : null}</div> : null}
    <main className="studio-workspace template-workspace">
      <aside className="studio-library"><a className="library-tool-button" href="/studio"><StudioIcon name="pencil" /><strong>Pages and Posts</strong></a><button className="library-tool-button is-active" type="button" onClick={library}><StudioIcon name="block" /><strong>Templates</strong></button>
        {set ? <><div className="template-targets">{[...set.templates, ...set.parts].map(item => <button type="button" className={item.id === target?.id ? "is-active" : ""} key={item.id} onClick={() => openSet(set, item.id)}>{item.name} <small>({item.kind})</small></button>)}</div><fieldset disabled={!writable}><legend>Add to This Set</legend><div className="template-targets">{(["page", "post", "header", "footer"] as const).map(kind => <button type="button" key={kind} onClick={() => addTarget(kind)}>New {kind === "page" ? "Page Template" : kind === "post" ? "Post Template" : kind === "header" ? "Header" : "Footer"}</button>)}</div>{target ? <div className="template-targets"><button type="button" onClick={() => askName("Rename", target.name, name => { return changeSet({ ...set, templates: set.templates.map(item => item.id === target.id ? { ...item, name } : item), parts: set.parts.map(item => item.id === target.id ? { ...item, name } : item) }); })}>Rename</button><button type="button" onClick={duplicateTarget}>Duplicate</button><button type="button" onClick={deleteTarget}>Delete</button></div> : null}</fieldset></> : null}
      </aside>
      {mediaTarget ? <section className="template-library" style={{ gridColumn: "span 2" }}><button type="button" onClick={() => setMediaTarget(null)}>Back to Template</button><MediaManager writable={writable} targetLabel={mediaTarget.logo ? "Site logo" : "Template image"} targetKind="block" onInsertImage={insertMedia} /></section> : set && target ? <TemplateEditor key={target.id} set={set} target={target} documents={workspace.workspace.documents} mediaUrls={media.urls} writable={writable} onChange={changeSet} onEditPart={id => openSet(set, id)} onOpenMedia={(blockId, logo = false) => setMediaTarget({ blockId, logo })} undo={templates.undo} redo={templates.redo} canUndo={templates.canUndo} canRedo={templates.canRedo} /> : <section className="template-library" style={{ gridColumn: "span 2" }}><h1>Site templates</h1><p>Create a consistent page and post design. Each set has its own shared parts, identity and styles.</p><div className="template-library-actions"><button className="button-primary" type="button" disabled={!writable} onClick={() => askName("Create Template Set", uniqueName("ACM Neutral"), name => { const item = createTemplateSet(name); const saved = templates.commit(store => ({ ...store, sets: [...store.sets, item] })); if (saved) openSet(item); return saved; })}><StudioIcon name="add" />Create Template Set</button><button type="button" disabled={!writable} onClick={() => importRef.current?.click()}>Import</button><input ref={importRef} hidden type="file" accept=".json,application/json" onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ""; }} /></div><div className="template-set-grid">{templates.store.sets.map(item => <article className="template-set-card" key={item.id}><h2>{item.name}</h2><p>{item.templates.length} templates · {item.parts.length} shared parts</p><button type="button" onClick={() => openSet(item)}>Open Templates</button><div className="template-set-actions"><button type="button" disabled={!writable} onClick={() => askName("Rename Template Set", item.name, name => changeSet({ ...item, name }))}>Rename</button><button type="button" disabled={!writable} onClick={() => void duplicateSet(item)}>Duplicate</button><button type="button" disabled={busy} onClick={() => void exportSet(item)}>Export</button><button type="button" disabled={!writable} onClick={() => deleteSet(item)}>Delete</button></div></article>)}</div>{!templates.store.sets.length && templates.ready ? <p>No template sets yet. Create one to start with the neutral ACM design.</p> : null}</section>}
    </main>
    {dialog ? <dialog ref={dialogRef} className="template-dialog" aria-labelledby="template-dialog-title" onCancel={event => { event.preventDefault(); closeDialog(); }}><button className="template-dialog-close" type="button" aria-label="Close" onClick={closeDialog}><StudioIcon name="close" /></button><form onSubmit={event => { event.preventDefault(); if (dialog.confirm(dialog.name.trim()) !== false) closeDialog(); }}><h2 id="template-dialog-title">{dialog.title}</h2>{dialog.title.startsWith("Delete ") ? <p>This removes the local item. A saved export can be imported again.</p> : <label>Name<input required maxLength={160} value={dialog.name} onChange={event => setDialog({ ...dialog, name: event.target.value })} /></label>}<div className="template-dialog-actions"><button type="button" onClick={closeDialog}>Cancel</button><button className="button-primary" type="submit" disabled={!writable}>{dialog.title.startsWith("Delete ") ? "Delete" : "Save"}</button></div></form></dialog> : null}
  </div>;
}
