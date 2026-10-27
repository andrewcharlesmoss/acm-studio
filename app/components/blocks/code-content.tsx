"use client";
import { useCodePresentation } from "./code-presentation-context";
import type { Ref } from "react";
import { highlightCode } from "../../content/code-highlighting.mjs";

/** The painted code owns its intrinsic height in both editor and preview. */
export function CodeContent({ code, language, className = "", editing = false, studio = true, ref }: {
  code: string;
  language?: string;
  className?: string;
  editing?: boolean;
  studio?: boolean;
  ref?: Ref<HTMLPreElement>;
}) {
  const style = useCodePresentation();
  const highlighted = highlightCode(code, language);
  return <pre className={[studio && "studio-code-preview", editing && "code-highlight", className].filter(Boolean).join(" ") || undefined} style={style} ref={ref} aria-hidden={editing || undefined} data-language={highlighted.language}>
    <code dangerouslySetInnerHTML={{ __html: highlighted.html }} />
  </pre>;
}
