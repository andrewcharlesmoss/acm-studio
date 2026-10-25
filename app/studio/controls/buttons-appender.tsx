"use client";
import { StudioIcon } from "../studio-icons";
import "./buttons-appender.css";

/** Presentation only; the editor owns insertion and its child limit. */
export function ButtonsAppender({ disabled = false, inert = false, visible = true, onAdd }: { disabled?: boolean; inert?: boolean; visible?: boolean; onAdd?: () => void }) {
  return <span className="studio-buttons-appender" hidden={!visible} inert={inert || undefined}>
    <button type="button" aria-label="Add button" title="Add button" disabled={disabled} tabIndex={inert ? -1 : undefined} onClick={event => { event.stopPropagation(); onAdd?.(); }}><StudioIcon name="add" size={24} /></button>
  </span>;
}
