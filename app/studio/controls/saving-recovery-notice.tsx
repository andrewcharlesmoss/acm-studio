"use client";
import "./saving-recovery-notice.css";

/** Recovery presentation only; the document session retains commands and draft ownership. */
export function SavingRecoveryNotice({ message, reconnecting = false, onExportDraft, onReconnect }: { message: string; reconnecting?: boolean; onExportDraft: () => void; onReconnect: () => void }) {
  return <div className="design-notice saving-recovery-notice" role="alert"><span>{message}</span><div className="saving-recovery-actions"><button type="button" onClick={onExportDraft}>Export Draft</button><button type="button" disabled={reconnecting} onClick={onReconnect}>{reconnecting ? "Reconnecting…" : "Reconnect"}</button></div></div>;
}
