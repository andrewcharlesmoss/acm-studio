import { createContext, useContext, useId, useRef, useState, type ReactNode } from "react";
import { StudioIcon } from "./studio-icons";

const InspectorContentDisabledContext = createContext(false);

export function useInspectorContentDisabled() {
  return useContext(InspectorContentDisabledContext);
}

export function InspectorContentDisabledProvider({ disabled, children }: { disabled: boolean; children: ReactNode }) {
  return <InspectorContentDisabledContext.Provider value={disabled}>{children}</InspectorContentDisabledContext.Provider>;
}

export function InspectorAccordionSection({ kind, title, detail, className, contentDisabled = false, defaultOpen = true, onOpenChange, label, children }: { kind?: "page" | "post"; title: ReactNode; detail?: string; className?: string; contentDisabled?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; label?: string; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  // Track queued toggles without invoking callbacks inside a replayable state updater.
  const pendingOpen = useRef(defaultOpen);
  function toggleOpen() {
    const next = !pendingOpen.current;
    pendingOpen.current = next;
    setOpen(next);
    onOpenChange?.(next);
  }
  const inheritedDisabled = useContext(InspectorContentDisabledContext);
  const contentId = useId();
  return <section className={`inspector-accordion-section${className ? ` ${className}` : ""}`} data-document-kind={kind} aria-label={label}>
    <h2><button type="button" className="inspector-accordion-heading" aria-expanded={open} aria-controls={contentId} onClick={toggleOpen}><span>{title}</span>{detail ? <span className="inspector-accordion-detail">{detail}</span> : null}<StudioIcon name={title === "Advanced" ? "chevron-down" : open ? "chevron-down" : "chevron-right"} size={16} className={title === "Advanced" && open ? "is-expanded-advanced" : undefined} /></button></h2>
    <div id={contentId} className="inspector-accordion-content" hidden={!open}><fieldset disabled={contentDisabled || inheritedDisabled}>{children}</fieldset></div>
  </section>;
}
