"use client";

import { forwardRef, Fragment, useMemo, type UIEvent } from "react";
import { unrepresentedFormattedGuideLines } from "./formatted-guide-lines";
import "../style-guide.css";

type FormattedBlock =
  | { type: "blank"; line: number }
  | { type: "heading"; line: number; level: number; text: string }
  | { type: "paragraph"; line: number; lines: { line: number; text: string }[] }
  | { type: "quote"; line: number; lines: { line: number; text: string }[] }
  | { type: "list"; line: number; ordered: boolean; items: { line: number; text: string; continuations: { line: number; text: string }[] }[] }
  | { type: "table"; line: number; endLine: number; headings: string[]; separatorLine: number | null; rows: { line: number; cells: string[] }[] }
  | { type: "rule"; line: number };

function parseFormattedBlocks(lines: string[]): FormattedBlock[] {
  const blocks: FormattedBlock[] = [];
  for (let index = 0; index < lines.length;) {
    const text = lines[index].trim();
    const line = index + 1;
    if (!text) { blocks.push({ type: "blank", line }); index++; continue; }
    const heading = /^(#{1,6})\s+(.+)$/.exec(text);
    if (heading) { blocks.push({ type: "heading", line, level: heading[1].length, text: heading[2] }); index++; continue; }
    if (/^\|/.test(text)) {
      const tableLines: { line: number; cells: string[] }[] = [];
      while (index < lines.length && /^\s*\|/.test(lines[index])) {
        const raw = lines[index].trim();
        const cells = raw.slice(1, raw.endsWith("|") ? -1 : undefined).split("|").map(cell => cell.trim());
        if (!cells.every(cell => /^:?-{3,}:?$/.test(cell))) tableLines.push({ line: index + 1, cells });
        else tableLines.push({ line: index + 1, cells: [] });
        index++;
      }
      const headings = tableLines[0]?.cells ?? [];
      const separator = tableLines.find(row => row.cells.length === 0);
      const rows = tableLines.slice(1).filter(row => row.cells.length > 0);
      blocks.push({ type: "table", line, endLine: index, headings, separatorLine: separator?.line ?? null, rows });
      continue;
    }
    if (/^(?:---+|\*\*\*+|___+)$/.test(text)) { blocks.push({ type: "rule", line }); index++; continue; }
    if (/^>\s?/.test(text)) {
      const quoteLines: { line: number; text: string }[] = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) { quoteLines.push({ line: index + 1, text: lines[index].replace(/^\s*>\s?/, "") }); index++; }
      blocks.push({ type: "quote", line, lines: quoteLines }); continue;
    }
    const listMatch = /^\s*((?:[-*+])|(?:\d+[.)]))\s+(.+)$/.exec(lines[index]);
    if (listMatch) {
      const ordered = /^\d/.test(listMatch[1]);
      const items: { line: number; text: string; continuations: { line: number; text: string }[] }[] = [];
      while (index < lines.length) {
        const item = /^\s*((?:[-*+])|(?:\d+[.)]))\s+(.+)$/.exec(lines[index]);
        if (item && /^\d/.test(item[1]) === ordered) {
          items.push({ line: index + 1, text: item[2], continuations: [] }); index++; continue;
        }
        if (items.length && /^\s{2,}\S/.test(lines[index]) && !/^\s{2,}(?:[-*+]|\d+[.)])\s+/.test(lines[index])) {
          items.at(-1)!.continuations.push({ line: index + 1, text: lines[index].trim() }); index++; continue;
        }
        break;
      }
      blocks.push({ type: "list", line, ordered, items }); continue;
    }
    const paragraphLines: { line: number; text: string }[] = [];
    while (index < lines.length && lines[index].trim() && !/^(#{1,6})\s+|\s*\||\s*>\s?|\s*(?:[-*+]|\d+[.)])\s+|(?:---+|\*\*\*+|___+)$/.test(lines[index])) {
      paragraphLines.push({ line: index + 1, text: lines[index].trim() }); index++;
    }
    if (paragraphLines.length) blocks.push({ type: "paragraph", line, lines: paragraphLines });
    else index++;
  }
  return blocks;
}

function renderGuideInline(text: string, query: string): React.ReactNode {
  const tokenPattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
  const tokens = text.split(tokenPattern).filter(Boolean);
  return tokens.map((token, index) => {
    let node: React.ReactNode = token;
    if ((token.startsWith("**") && token.endsWith("**")) || (token.startsWith("__") && token.endsWith("__"))) node = <strong>{renderGuideText(token.slice(2, -2), query)}</strong>;
    else if ((token.startsWith("*") && token.endsWith("*")) || (token.startsWith("_") && token.endsWith("_"))) node = <em>{renderGuideText(token.slice(1, -1), query)}</em>;
    else if (token.startsWith("`") && token.endsWith("`")) node = <code>{renderGuideText(token.slice(1, -1), query)}</code>;
    else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (link) {
        const safeHref = /^(?:https?:|mailto:|\/|#)/i.test(link[2]) ? link[2] : undefined;
        node = safeHref ? <a href={safeHref}>{renderGuideText(link[1], query)}</a> : link[1];
      }
    }
    return <span key={index}>{node}</span>;
  });
}

function renderGuideText(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const at = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  return at < 0 ? text : <>{text.slice(0, at)}<mark>{text.slice(at, at + query.length)}</mark>{text.slice(at + query.length)}</>;
}

export const FormattedGuideDocument = forwardRef<HTMLDivElement, {
  lines: string[];
  query: string;
  activeLine?: number;
  active: boolean;
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
  guidePathByLine: Record<number, string>;
  onSelectSource: (path: string) => void;
}>(function FormattedGuideDocument({ lines, query, activeLine, active, onScroll, guidePathByLine, onSelectSource }, ref) {
  const blocks = useMemo(() => parseFormattedBlocks(lines), [lines]);
  const unrepresentedLines = new Set(unrepresentedFormattedGuideLines(blocks, lines.length));
  const missingBeforeByBlock = new Map<number, number[]>();
  let nextSourceLine = 1;
  blocks.forEach((block, index) => {
    const missingBefore: number[] = [];
    while (nextSourceLine < block.line) {
      if (unrepresentedLines.has(nextSourceLine)) missingBefore.push(nextSourceLine);
      nextSourceLine++;
    }
    missingBeforeByBlock.set(index, missingBefore);
    const lastSourceLine = block.type === "paragraph" || block.type === "quote"
      ? block.lines.at(-1)?.line ?? block.line
      : block.type === "list"
        ? block.items.at(-1)?.continuations.at(-1)?.line ?? block.items.at(-1)?.line ?? block.line
        : block.type === "table" ? block.endLine : block.line;
    nextSourceLine = Math.max(nextSourceLine, lastSourceLine + 1);
  });
  const trailingLines: React.ReactNode[] = [];
  while (nextSourceLine <= lines.length) {
    if (unrepresentedLines.has(nextSourceLine)) {
      const line = nextSourceLine;
      trailingLines.push(<div id={`sg-guide-formatted-line-${line}`} key={`fallback-${line}`} className="sg-formatted-block sg-formatted-source-fallback"><span className="sg-formatted-line" aria-label={`Source line ${line}`}>{line}</span><span>{renderGuideInline(lines[line - 1], query)}</span></div>);
    }
    nextSourceLine++;
  }
  const current = (start: number, end = start) => activeLine !== undefined && activeLine >= start && activeLine <= end;
  return <div
    ref={ref}
    className={`sg-guide-document sg-guide-formatted${active ? "" : " is-inactive"}`}
    role="region"
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The labelled source region needs keyboard scrolling.
    tabIndex={active ? 0 : -1}
    aria-hidden={!active}
    aria-label="Formatted Style Guide"
    onScroll={onScroll}
  >
    <article>
      {blocks.map((block, index) => {
        const missingBefore = (missingBeforeByBlock.get(index) ?? []).map(line => <div id={`sg-guide-formatted-line-${line}`} key={`fallback-${line}`} className="sg-formatted-block sg-formatted-source-fallback"><span className="sg-formatted-line" aria-label={`Source line ${line}`}>{line}</span><span>{renderGuideInline(lines[line - 1], query)}</span></div>);
        const withMissingLines = (node: React.ReactNode) => <Fragment key={`formatted-block-${index}`}>{missingBefore}{node}</Fragment>;
        const isCurrent = block.type === "paragraph" || block.type === "quote"
          ? block.lines.some(item => item.line === activeLine)
          : block.type === "list"
            ? block.items.some(item => item.line === activeLine || item.continuations.some(continuation => continuation.line === activeLine))
            : current(block.line, block.type === "table" ? block.endLine : block.line);
        const marker = <span className="sg-formatted-line" aria-label={`Source line ${block.line}`}>{block.line}</span>;
        if (block.type === "blank") return withMissingLines(<div id={`sg-guide-formatted-line-${block.line}`} className="sg-formatted-block sg-formatted-blank"><span className="sg-formatted-line" aria-label={`Source line ${block.line}`}>{block.line}</span><span aria-hidden="true" /></div>);
        if (block.type === "heading") {
          const Heading = `h${block.level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
          const path = guidePathByLine[block.line];
          return withMissingLines(<div id={`sg-guide-formatted-line-${block.line}`} data-guide-style-path={path} className={`sg-formatted-block${isCurrent ? " is-current-source" : ""}`} aria-current={isCurrent ? "location" : undefined}>{marker} <Heading>{renderGuideInline(block.text, query)}</Heading>{path ? <button className="sg-guide-line-action" type="button" aria-label={`Select ${path} in the preview`} onClick={() => onSelectSource(path)} /> : null}</div>);
        }
        if (block.type === "paragraph" || block.type === "quote") {
          const Content = block.type === "quote" ? "blockquote" : "p";
          return withMissingLines(<div className="sg-formatted-block"><Content>{block.lines.map(item => { const path = guidePathByLine[item.line]; return <span id={`sg-guide-formatted-line-${item.line}`} key={item.line} data-guide-line={item.line} data-guide-style-path={path} aria-current={activeLine === item.line ? "location" : undefined} className={`sg-formatted-source-line${activeLine === item.line ? " is-current-source" : ""}`}>{renderGuideInline(item.text, query)}{path ? <button className="sg-guide-line-action" type="button" aria-label={`Select ${path} in the preview`} onClick={() => onSelectSource(path)} /> : null} </span>; })}</Content></div>);
        }
        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return withMissingLines(<div className="sg-formatted-block"><List>{block.items.map(item => { const path = guidePathByLine[item.line]; return <li id={`sg-guide-formatted-line-${item.line}`} key={item.line} data-guide-style-path={path} aria-current={activeLine === item.line ? "location" : undefined} className={activeLine === item.line ? "is-current-source" : undefined}><span data-guide-line={item.line} className="sg-formatted-source-line"><span className="visually-hidden">Source line {item.line}. </span>{renderGuideInline(item.text, query)}{path ? <button className="sg-guide-line-action" type="button" aria-label={`Select ${path} in the preview`} onClick={() => onSelectSource(path)} /> : null}</span>{item.continuations.map(continuation => { const continuationPath = guidePathByLine[continuation.line]; return <span id={`sg-guide-formatted-line-${continuation.line}`} key={continuation.line} data-guide-line={continuation.line} data-guide-style-path={continuationPath} aria-current={activeLine === continuation.line ? "location" : undefined} className={`sg-formatted-source-line${activeLine === continuation.line ? " is-current-source" : ""}`}>{renderGuideInline(continuation.text, query)}{continuationPath ? <button className="sg-guide-line-action" type="button" aria-label={`Select ${continuationPath} in the preview`} onClick={() => onSelectSource(continuationPath)} /> : null}</span>; })}</li>; })}</List></div>);
        }
        if (block.type === "rule") return withMissingLines(<div id={`sg-guide-formatted-line-${block.line}`} className={`sg-formatted-block sg-formatted-rule${isCurrent ? " is-current-source" : ""}`} aria-current={isCurrent ? "location" : undefined}>{marker}<span aria-hidden="true" /></div>);
        const currentTableRow = block.rows.some(row => row.line === activeLine);
        const highlightTable = isCurrent && !currentTableRow;
        const tableContentRows = [
          ...(block.separatorLine && block.separatorLine !== block.line ? [{ type: "separator" as const, line: block.separatorLine }] : []),
          ...block.rows.map(row => ({ type: "row" as const, ...row })),
          ...Array.from({ length: Math.max(0, block.endLine - block.line) }, (_, offset) => block.line + offset + 1)
            .filter(line => unrepresentedLines.has(line))
            .map(line => ({ type: "fallback" as const, line })),
        ].sort((left, right) => left.line - right.line);
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Preserve the existing keyboard-selectable source table target.
        return withMissingLines(<div data-guide-style-path={guidePathByLine[block.line]} tabIndex={guidePathByLine[block.line] ? 0 : undefined} aria-label={guidePathByLine[block.line] ? `Select ${guidePathByLine[block.line]} in the preview` : undefined} className={`sg-formatted-block sg-formatted-table${highlightTable ? " is-current-source" : ""}`} aria-current={isCurrent ? "location" : undefined}>
          <table><thead><tr id={`sg-guide-formatted-line-${block.line}`}>{block.headings.length ? block.headings.map((heading, cell) => <th key={cell} data-guide-line={cell === 0 ? block.line : undefined}>{renderGuideInline(heading, query)}</th>) : <th colSpan={1} data-guide-line={block.line}>{renderGuideInline(lines[block.line - 1], query)}</th>}</tr></thead><tbody>{tableContentRows.map(row => {
            if (row.type === "separator") return <tr id={`sg-guide-formatted-line-${row.line}`} key={row.line} className="sg-formatted-table-separator"><td colSpan={Math.max(1, block.headings.length)} data-guide-line={row.line} /></tr>;
            if (row.type === "fallback") return <tr id={`sg-guide-formatted-line-${row.line}`} key={row.line} className="sg-formatted-table-fallback"><td colSpan={Math.max(1, block.headings.length)} data-guide-line={row.line}>{renderGuideInline(lines[row.line - 1], query)}</td></tr>;
            const path = guidePathByLine[row.line];
            return <tr id={`sg-guide-formatted-line-${row.line}`} key={row.line} data-guide-style-path={path} aria-current={activeLine === row.line ? "location" : undefined} className={activeLine === row.line ? "is-current-row" : undefined}>{row.cells.map((cell, cellIndex) => <td key={cellIndex} data-guide-line={cellIndex === 0 ? row.line : undefined}>{renderGuideInline(cell, query)}{cellIndex === 0 && path ? <button className="sg-guide-line-action" type="button" aria-label={`Select ${path} in the preview`} onClick={() => onSelectSource(path)} /> : null}</td>)}</tr>;
          })}</tbody></table>
        </div>);
      })}{trailingLines}
    </article>
  </div>;
});
