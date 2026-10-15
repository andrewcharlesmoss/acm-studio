import type { ReactNode, RefObject } from "react";
import { StudioIcon } from "../studio-icons";

export function PopoverHeading({ children, title, closeLabel, onClose, closeRef, actions, className = "paragraph-colour-palette-heading" }: { children?: ReactNode; title?: ReactNode; actions?: ReactNode; className?: string; closeLabel: string; onClose: () => void; closeRef?: RefObject<HTMLButtonElement | null> }) {
  return <div className={className}><strong>{title ?? children}</strong>{actions}<button ref={closeRef} type="button" aria-label={closeLabel} title="Close" onClick={onClose}><StudioIcon name="close" size={16} /></button></div>;
}
