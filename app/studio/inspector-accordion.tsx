import { createContext, useContext, useId, useState, type ReactNode } from "react";
import { StudioIcon } from "./studio-icons";

const InspectorContentDisabledContext = createContext(false);

export function InspectorContentDisabledProvider({ disabled, children }: { disabled: boolean; children: ReactNode }) {
  return <InspectorContentDisabledContext.Provider value={disabled}>{children}</InspectorContentDisabledContext.Provider>;
}

export function InspectorAccordionSection({ kind, title, detail, className, contentDisabled = false, children }: { kind?: "page" | "post"; title: ReactNode; detail?: string; className?: string; contentDisabled?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const inheritedDisabled = useContext(InspectorContentDisabledContext);
  const contentId = useId();
  return <section className={`inspector-accordion-section${className ? ` ${className}` : ""}`} data-document-kind={kind}>
    <h2><button type="button" className="inspector-accordion-heading" aria-expanded={open} aria-controls={contentId} onClick={() => setOpen(value => !value)}><span>{title}</span>{detail ? <span className="inspector-accordion-detail">{detail}</span> : null}<StudioIcon name={open ? "chevron-down" : "chevron-right"} size={16} /></button></h2>
    <div id={contentId} className="inspector-accordion-content" hidden={!open}>{contentDisabled || inheritedDisabled ? <fieldset disabled>{children}</fieldset> : children}</div>
  </section>;
}
