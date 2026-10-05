import type { ReactNode, RefObject } from "react";
import { StudioIcon } from "../studio-icons";

export function PopoverHeading({ children, closeLabel, onClose, closeRef }: { children: ReactNode; closeLabel: string; onClose: () => void; closeRef?: RefObject<HTMLButtonElement | null> }) {
  return <div className="paragraph-colour-palette-heading"><strong>{children}</strong><button ref={closeRef} type="button" aria-label={closeLabel} title="Close" onClick={onClose}><StudioIcon name="close" size={16} /></button></div>;
}
