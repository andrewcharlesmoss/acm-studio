"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { useStudioWorkspace } from "./use-studio-workspace";
import type { useTemplates } from "./use-templates";
import { StudioIcon } from "./studio-icons";
import { restoreLocallyPublishedArticle } from "../content/local-publishing";
import { copyTemplateData, visitTemplateNodes } from "./template-model";
import type { StudioBinnedDocument } from "./editor-model";
import type { StudioBinnedTemplate } from "./template-model";

type WorkspaceSession = ReturnType<typeof useStudioWorkspace>;
type TemplateSession = ReturnType<typeof useTemplates>;
type BinTarget = { id: string; label: string; kind: "document" | "template" | "set" };

function formattedDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export function StudioBin({ workspace, templates }: { workspace: WorkspaceSession; templates: TemplateSession }) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [permanentTarget, setPermanentTarget] = useState<BinTarget | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const writable = workspace.writable && templates.writable;
  const entries = [
    ...workspace.workspace.bin.map(item => ({ id: item.id, label: item.document.title, detail: `${item.document.kind === "page" ? "Page" : "Post"} · deleted ${formattedDate(item.deletedAt)}`, kind: "document" as const, mark: item.document.kind === "page" ? "P" : "A", deletedAt: item.deletedAt })),
    ...templates.store.bin.map(item => ({ id: item.id, label: item.kind === "set" ? item.set.name : item.entry.name, detail: `${item.kind === "set" ? "Template set" : item.entry.kind === "page" || item.entry.kind === "post" ? `${item.entry.kind} template` : `Shared ${item.entry.kind}`} · deleted ${formattedDate(item.deletedAt)}`, kind: item.kind, mark: item.kind === "set" ? "S" : "T", deletedAt: item.deletedAt })),
  ].sort((left, right) => right.deletedAt.localeCompare(left.deletedAt));

  useEffect(() => {
    if (!permanentTarget) return;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, [permanentTarget]);

  function closePermanentDialog() {
    dialogRef.current?.close();
    setPermanentTarget(null);
    requestAnimationFrame(() => openerRef.current?.isConnected && openerRef.current.focus());
  }

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
      setFeedback("Restore the template assigned to this document before restoring the document.");
      return;
    }
    const saved = workspace.commit(current => ({ ...current, bin: current.bin.filter(candidate => candidate.id !== item.id), documents: [...current.documents, item.document], activeDocumentId: item.document.id }));
    if (!saved) { setFeedback("This document could not be restored because the workspace could not be saved."); return; }
    if (item.assignment && !templates.commit(current => ({ ...current, assignments: [...current.assignments.filter(assignment => assignment.documentId !== item.document.id), item.assignment!] }))) {
      workspace.commit(current => ({ ...current, documents: current.documents.filter(document => document.id !== item.document.id), bin: [...current.bin, item] }));
      setFeedback("The document was put back in the Bin because its template assignment could not be restored.");
      return;
    }
    if (item.publication) {
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
    const collectPartReferences = (nodes: typeof item.entry.nodes) => visitTemplateNodes(nodes, node => { if (node.type === "part" && !referencedPartIds.has(node.partId)) { referencedPartIds.add(node.partId); pendingPartIds.push(node.partId); } });
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
        parts: item.entry.kind === "header" || item.entry.kind === "footer" ? [...candidate.parts, copyTemplateData(item.entry) as typeof candidate.parts[number]] : [...candidate.parts, ...copyTemplateData(additions)],
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

  return <section className="studio-bin" aria-labelledby="studio-bin-title">
    <header><div><p className="studio-eyebrow">RECOVER DELETED WORK</p><h1 id="studio-bin-title">Bin</h1><p>Restore pages, posts and templates, or permanently delete them when you’re sure.</p></div><span>{entries.length} {entries.length === 1 ? "item" : "items"}</span></header>
    {feedback ? <p className="studio-bin-feedback" role="status">{feedback}</p> : null}
    {entries.length ? <ul className="studio-bin-list">{entries.map(entry => <li className="studio-bin-item" key={`${entry.kind}/${entry.id}`}>
      <span className="document-kind-mark" aria-hidden="true">{entry.mark}</span><span className="studio-bin-copy"><strong>{entry.label}</strong><small>{entry.detail}</small></span>
      <div className="studio-bin-actions"><button type="button" disabled={!writable} onClick={() => entry.kind === "document" ? restoreDocument(workspace.workspace.bin.find(item => item.id === entry.id)!) : restoreTemplate(templates.store.bin.find(item => item.id === entry.id)!)}><StudioIcon name="undo" size={16} />Restore</button><button className="danger-button" type="button" disabled={!writable} onClick={event => askPermanentDelete(event, entry)}><StudioIcon name="trash" size={16} />Delete permanently</button></div>
    </li>)}</ul> : <p className="studio-bin-empty">The Bin is empty.</p>}
    <dialog ref={dialogRef} className="template-dialog" aria-labelledby="studio-bin-confirm-title" onCancel={event => { event.preventDefault(); closePermanentDialog(); }} onClose={() => setPermanentTarget(null)}>
      <button className="template-dialog-close" type="button" aria-label="Close permanent delete confirmation" onClick={closePermanentDialog}><StudioIcon name="close" /></button>
      <h2 id="studio-bin-confirm-title">Delete permanently?</h2><p>This will permanently delete “{permanentTarget?.label}”. You won’t be able to restore it.</p>
      <div className="template-dialog-actions"><button type="button" onClick={closePermanentDialog}>Cancel</button><button className="button-primary" type="button" disabled={!writable} onClick={() => permanentTarget && permanentlyDelete(permanentTarget)}>Delete permanently</button></div>
    </dialog>
  </section>;
}
