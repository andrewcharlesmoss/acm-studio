"use client";
import { useState } from "react";
import { StudioIcon } from "../studio-icons";
import "./saving-recovery-notice.css";

/** Recovery presentation only; the document session retains commands and draft ownership. */
export function SavingRecoveryNotice({ message, reconnecting = false, onExportDraft, onReconnect }: { message: string; reconnecting?: boolean; onExportDraft: () => void; onReconnect: () => void }) {
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null);
  if (dismissedMessage === message) return null;
  return <div className="design-notice saving-recovery-notice" role="alert"><span>{message}</span><div className="saving-recovery-actions"><button type="button" onClick={onExportDraft}>Export Draft</button><button type="button" disabled={reconnecting} onClick={onReconnect}>{reconnecting ? "Reconnecting…" : "Reconnect"}</button></div><button type="button" className="saving-recovery-dismiss" aria-label="Dismiss saving notice" title="Dismiss saving notice" onClick={() => setDismissedMessage(message)}><StudioIcon name="close" size={18} /></button></div>;
}
