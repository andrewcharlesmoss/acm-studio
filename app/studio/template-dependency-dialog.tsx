"use client";

import { CheckboxControl } from "./controls/checkbox-control";
import { SelectControl } from "./controls/native-fields";
import { useState, type RefObject } from "react";
import { StudioDialog, StudioDialogActions } from "./overlays/dialog";
import { StudioButton } from "./controls/button";
import { dependencyOwnerName, type TemplateDependency, type TemplateDependencyTarget } from "./template-dependencies";
import type { TemplateStore } from "./template-model";

export function TemplateDependencyDialog({ name, target, store, rows, unavailable, onApply, onOpenReference, onClose, opener }: {
  name: string; target: TemplateDependencyTarget; store: TemplateStore; rows: TemplateDependency[]; unavailable?: string;
  onApply: (rows: TemplateDependency[], replacement: TemplateDependencyTarget | null, report: (message: string) => void) => Promise<void>;
  onOpenReference: (key: string) => void; onClose: () => void; opener: RefObject<HTMLElement | null>;
}) {
  const [selected, setSelected] = useState<TemplateDependency[]>([]);
  const [choice, setChoice] = useState("detach");
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const entry = store.sets.find(set => set.id === target.setId)?.templates.find(item => item.id === target.entryId);
  const replacements = store.sets.flatMap(set => set.templates.filter(item => item.kind === entry?.kind && !(set.id === target.setId && item.id === target.entryId)).map(item => ({ target: { setId: set.id, entryId: item.id }, name: item.name })));
  const selectable = rows.filter(row => row.manageable);
  function toggle(items: TemplateDependency[], checked: boolean) {
    setReview(false); setMessages([]);
    setSelected(current => checked ? [...current.filter(row => !items.some(item => item.key === row.key)), ...items] : current.filter(row => !items.some(item => item.key === row.key)));
  }
  async function apply() {
    const replacement = choice === "detach" ? null : replacements.find(item => `${item.target.setId}/${item.target.entryId}` === choice)?.target;
    if (replacement === undefined) { setMessages(["Choose an available replacement."]); return; }
    setBusy(true); setMessages([]);
    try { await onApply(selected, replacement, message => setMessages(current => [...current, message])); setSelected([]); setReview(false); }
    catch (error) { setMessages(current => [...current, error instanceof Error ? error.message : "Assignments could not be saved. Your data was kept."]); setReview(false); }
    finally { setBusy(false); }
  }
  const kindLabel = (row: TemplateDependency) => ({ document: "Document assignment", publication: "Published layout", bin: "Document in Bin", default: "Default choice", part: "Shared-part reference", navigation: "Site navigation", recovery: "Recovery copy" })[row.kind];
  return <StudioDialog title={`Manage dependencies — ${name}`} className="template-dependency-dialog" returnFocus={opener} onClose={() => { if (!busy) onClose(); }}>
    <p>Replace or detach selected assignments. Content stays intact. Published layout selections also change the local preview.</p>
    {unavailable ? <p role="alert">{unavailable}</p> : null}
    <CheckboxControl className="template-dependency-select-all" disabled={busy || Boolean(unavailable) || !selectable.length} checked={Boolean(selectable.length && selectable.every(row => selected.some(item => item.key === row.key)))} onChange={checked => toggle(selectable, checked)} label={<>Select all assignments</>} />
    <p>{selectable.length} {selectable.length === 1 ? "assignment" : "assignments"} across Studio Drafts, Test and Test2.</p>
    <div className="template-dependency-groups" aria-label="Template dependency owners">{(["drafts", "test", "test2", "global"] as const).map(owner => {
      const items = rows.filter(row => row.owner === owner); if (!items.length) return null;
      const assignable = items.filter(row => row.manageable);
      return <section key={owner}><h3>{dependencyOwnerName(owner)}</h3>{assignable.length ? <CheckboxControl disabled={busy || Boolean(unavailable)} checked={assignable.every(row => selected.some(item => item.key === row.key))} onChange={checked => toggle(assignable, checked)} label={<>Select {dependencyOwnerName(owner)} assignments</>} /> : null}
        <ul>{items.map(row => <li key={row.key}>{row.manageable ? <CheckboxControl disabled={busy || Boolean(unavailable)} checked={selected.some(item => item.key === row.key)} onChange={checked => toggle([row], checked)} label={<>{row.label}<small>{kindLabel(row)}</small></>} /> : <div><strong>{row.label}</strong><small>{kindLabel(row)}{row.blocking ? " — must be resolved before deletion" : " — retained for recovery"}</small>{row.kind === "part" ? <button type="button" disabled={busy} onClick={() => onOpenReference(row.key)}>Edit referencing template</button> : null}</div>}</li>)}</ul></section>;
    })}</div>
    {!rows.some(row => row.blocking) ? <p>No active dependencies. This template can be moved to the Bin.</p> : null}
    <p>Recovery designs and saved history remain available. Shared-part and site-navigation references must be resolved in their owning templates.</p>
    {entry ? <label className="template-dependency-replacement">Change selected assignments<SelectControl value={choice} disabled={busy || Boolean(unavailable)} onChange={event => { setChoice(event.target.value); setReview(false); }}><option value="detach">Detach — use existing presentation</option>{replacements.map(item => <option key={`${item.target.setId}/${item.target.entryId}`} value={`${item.target.setId}/${item.target.entryId}`}>Replace with {item.name}</option>)}</SelectControl></label> : null}
    {review ? <p role="status">{choice === "detach" ? "Detach" : "Replace"} {selected.length} selected {selected.length === 1 ? "assignment" : "assignments"}. Each owner saves separately; completed saves are kept if another owner fails.</p> : null}
    {messages.length ? <ul className="template-dependency-results" role="status">{messages.map((message, index) => <li key={index}>{message}</li>)}</ul> : null}
    <StudioDialogActions><StudioButton type="button" variant="secondary" disabled={busy} onClick={() => { setSelected([]); setReview(false); setMessages([]); }}>Refresh selection</StudioButton><StudioButton type="button" variant="secondary" disabled={busy} onClick={onClose}>Close</StudioButton><StudioButton type="button" disabled={busy || Boolean(unavailable) || !selected.length || !entry} onClick={() => review ? void apply() : setReview(true)}>{busy ? "Saving assignments…" : review ? "Apply changes" : "Review changes"}</StudioButton></StudioDialogActions>
  </StudioDialog>;
}
