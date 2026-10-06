"use client";

import { StudioIcon } from "../studio-icons";

export function HiddenBlockPlaceholder({ label, writable, onShow }: { label: string; writable: boolean; onShow: () => void }) {
  return <div className="hidden-block-placeholder"><StudioIcon name="visibility-off" size={18} /><span>{label} is hidden</span><button type="button" disabled={!writable} onClick={onShow}>Show</button></div>;
}
