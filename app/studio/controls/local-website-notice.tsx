"use client";
import type { ReactNode } from "react";
import { StudioIcon } from "../studio-icons";

export function LocalWebsiteNotice({ siteName, onDismiss, children }: { siteName?: string; onDismiss: () => void; children?: ReactNode }) {
  return <div className="studio-notice studio-local-website-notice" role="note">
    <span>{children ?? (siteName ? <><strong>Local {siteName} website.</strong> Saved changes are stored on this workstation and update its local preview. The live website is unchanged.</> : <><strong>Local-only Studio.</strong> Content and files remain in this browser; nothing is connected to hosted storage or published online.</>)}</span>
    <button type="button" aria-label="Close local website notice" title="Close" onClick={onDismiss}><StudioIcon name="close" size={18} /></button>
  </div>;
}
