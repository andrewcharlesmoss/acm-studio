import type { ReactNode } from "react";
import "./canonical-source-lines.css";

/** Read-only numbered source lines, shared by both style editors. */
export function CanonicalSourceLines({ lines, activeLine, query = "", idPrefix, pathByLine = {}, onSelectPath }: {
  lines: readonly string[]; activeLine?: number; query?: string; idPrefix: string;
  pathByLine?: Record<number, string>; onSelectPath?: (path: string) => void;
}) {
  return <ol className="canonical-source-lines">{lines.map((line, index) => {
    const lineNumber = index + 1;
    const matchAt = query ? line.toLowerCase().indexOf(query.toLowerCase()) : -1;
    const content: ReactNode = matchAt < 0 ? line || " " : <>{line.slice(0, matchAt)}<mark>{line.slice(matchAt, matchAt + query.length)}</mark>{line.slice(matchAt + query.length)}</>;
    const path = pathByLine[lineNumber];
    return <li id={`${idPrefix}-line-${lineNumber}`} key={lineNumber} data-source-line={lineNumber} data-guide-style-path={path}
      aria-current={lineNumber === activeLine ? "location" : undefined} className={lineNumber === activeLine ? "is-current-source" : undefined}>
      <span className="canonical-source-line-number" aria-hidden="true">{lineNumber}</span><span>{content}</span>
      {path && onSelectPath ? <button className="canonical-source-line-action" type="button" aria-label={`Select ${path} in the preview`} onClick={() => onSelectPath(path)} /> : null}
    </li>;
  })}</ol>;
}

/** Centre within this scroll box; never scroll the outer document. */
export function canonicalSourceScrollTop(container: Pick<DOMRect, "top">, line: Pick<DOMRect, "top" | "height">, scrollTop: number, height: number) {
  return Math.max(0, scrollTop + line.top - container.top - (height - line.height) / 2);
}
