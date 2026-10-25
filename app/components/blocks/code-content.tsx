import type { Ref } from "react";
import { highlightCode } from "../../content/code-highlighting.mjs";

/** The painted code owns its intrinsic height in both editor and preview. */
export function CodeContent({ code, language, className = "", editing = false, ref }: {
  code: string;
  language?: string;
  className?: string;
  editing?: boolean;
  ref?: Ref<HTMLPreElement>;
}) {
  const highlighted = highlightCode(code, language);
  return <pre className={`studio-code-preview${editing ? " code-highlight" : ""}${className ? ` ${className}` : ""}`} ref={ref} aria-hidden={editing || undefined} data-language={highlighted.language}>
    <code dangerouslySetInnerHTML={{ __html: highlighted.html }} />
  </pre>;
}
