import type { MouseEventHandler, ReactNode } from "react";
import { StudioIcon } from "./studio-icons";

/** Recovery commands and acknowledgement remain with the owning Bin. */
export function BinList({ hasItems, emptyMessage, children }: { hasItems: boolean; emptyMessage: string; children: ReactNode }) {
  return hasItems ? <ul className="studio-bin-list">{children}</ul> : <p className="studio-bin-empty">{emptyMessage}</p>;
}

export function BinItem({ mark, label, detail, children }: { mark: string; label: string; detail: string; children: ReactNode }) {
  return <li className="studio-bin-item"><span className="document-kind-mark" aria-hidden="true">{mark}</span><span className="studio-bin-copy"><strong>{label}</strong><small>{detail}</small></span><div className="studio-bin-actions">{children}</div></li>;
}

export function BinRestoreButton({ disabled, onClick }: { disabled: boolean; onClick: MouseEventHandler<HTMLButtonElement> }) {
  return <button type="button" disabled={disabled} onClick={onClick}><StudioIcon name="undo" size={16} />Restore</button>;
}

export function BinFeedback({ children }: { children: ReactNode }) {
  return children ? <p className="studio-bin-feedback" role="status">{children}</p> : null;
}
