"use client";

import { Fragment, createElement, type ReactNode } from "react";
import type { ContentBlock } from "../content/model";
import { safeTextLink } from "../content/rich-text";
import { paragraphStyleToCss } from "../content/paragraph-styles";
import { BlockRenderer, renderText } from "../components/content";
import { BlockField, RichTextEditor, type RichTextEditorProps } from "./studio-canvas";
import { updateMiniGolfAuthoredCell } from "./mini-golf-table-authoring";
import { useMiniGolfRuntime, RuntimeScoreTable, golf, type MiniGolfRuntime } from "./mini-golf-runtime";
import type { StudioPresentation, StudioPresentationContext } from "./studio-presentation";

/** Shared source revision for the Mini Golf presentation adapter. */
export const MINI_GOLF_SOURCE_REVISION = "0d2df8bd31f277df31522aa47ca6bf785888c460";
// The score panel keeps the source identity used by existing draft migrations: mini-golf-scorecard-panel.
type Context = StudioPresentationContext & { runtime?: MiniGolfRuntime | null; runtimeLeader?: boolean };
type Section = Extract<ContentBlock, { type: "section" }>;
type Table = Extract<ContentBlock, { type: "table" }>;

function selected(context: Context, block: ContentBlock, props: Record<string, unknown> = {}) {
  if (context.mode !== "edit") return props;
  return { ...props, "data-studio-nested-block-id": block.id, "data-studio-selected": context.selectedBlockId === block.id, "data-studio-hovered": context.hoveredBlockId === block.id, onPointerDown: (event: React.PointerEvent) => { event.stopPropagation(); context.onSelectBlock?.(block.id); }, onFocus: (event: React.FocusEvent) => { event.stopPropagation(); context.onSelectBlock?.(block.id); } };
}

// Nested selections are attached to the source element itself: data-studio-nested-block-id={child.id}.

function editableText(context: Context, block: Extract<ContentBlock, { type: "heading" | "paragraph" }>, tag: string, className?: string, content?: ReactNode): ReactNode {
  const style = { ...(block.type === "paragraph" ? paragraphStyleToCss(block.style) : {}), ...(block.align ? { textAlign: block.align === "centre" ? "center" as const : block.align } : {}) };
  const props = selected(context, block, { className, style, role: block.siteRole === "status" ? "status" : undefined, "data-block-id": block.id });
  if (context.mode === "edit") return <RichTextEditor {...props} as={tag as RichTextEditorProps["as"]} text={block.text} runs={block.runs} onSelectionChange={() => undefined} onLinkActivate={() => undefined} onChange={(text, runs) => context.onUpdateBlock?.(block.id, (current) => current.type === block.type ? { ...current, text, runs } : current)} />;
  return createElement(tag, props, content ?? renderText(block.text, block.runs));
}

function action(context: Context, block: Extract<ContentBlock, { type: "button" }>, className: string) {
  const roleActions: Record<string, string> = { "reset-scores": "reset", "export-excel": "excel", "export-image": "image", "export-html": "html" };
  const binding = roleActions[block.siteRole ?? ""] ?? (block.siteRole === "new-game" || block.siteRole === "auto-resize" ? block.siteRole : ["reset", "excel", "image", "html"].find(value => block.id.endsWith(`-${value}`)));
  if (context.runtime && binding) return <button {...selected(context, block, { className, type: "button" })} onClick={() => void context.runtime?.run(binding)}>{context.runtime.feedback[binding] || block.label}</button>;
  return <button key={block.id} {...selected(context, block, { className, type: "button", "aria-disabled": true, "data-block-id": block.id })} onClick={(event) => event.preventDefault()}>{block.label}</button>;
}

function field(context: Context, block: Extract<ContentBlock, { type: "field" }>, id: string) {
  const binding = block.siteRole === "holes" || block.id.endsWith("-holes") ? "holes" : block.siteRole === "players" || block.id.endsWith("-players") ? "players" : null;
  if (context.runtime && binding) {
    const runtime = context.runtime;
    return <div {...selected(context, block, { className: "field" })}><label htmlFor={id}>{block.label}</label><select id={id} value={binding === "holes" ? runtime.game.holes : runtime.game.players.length} onChange={event => runtime.setGame(game => binding === "holes" ? golf.resizeHoles(game, Number(event.target.value)) : golf.resizePlayers(game, Number(event.target.value)))}>{Array.from({ length: binding === "holes" ? 18 : 8 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? binding.slice(0, -1) : binding}</option>)}</select></div>;
  }
  const options = block.options?.length ? block.options : [block.value];
  return <div key={block.id} {...selected(context, block, { className: "field", "data-block-id": block.id })}><label htmlFor={id}>{block.label}</label>{block.control === "select" ? <select id={id} value={block.value} aria-disabled={context.mode === "preview"} onChange={(event) => { if (context.mode !== "edit") return; const value = event.target.value; context.onUpdateBlock?.(block.id, (current) => current.type === "field" ? { ...current, value } : current); }}>{options.map((option) => <option key={option}>{option}</option>)}</select> : <input id={id} value={block.value} readOnly={context.mode === "preview"} onChange={(event) => { if (context.mode !== "edit") return; const value = event.target.value; context.onUpdateBlock?.(block.id, (current) => current.type === "field" ? { ...current, value } : current); }} />}</div>;
}

function renderScoreTable(context: Context, table: Table, tableFontSize: string) {
  if (context.runtime) return <div {...selected(context, table)}><RuntimeScoreTable runtime={context.runtime} table={table} mode={context.mode} onCellSelect={(row, column) => { context.onSelectBlock?.(table.id); context.onTableCellFocus?.(table.id, row, column); }} onCellChange={(row, column, value) => context.onUpdateBlock?.(table.id, current => current.type === "table" ? updateMiniGolfAuthoredCell(current, row, column, value) : current)} /></div>;
  // The table block owns its complete shape and values. Never manufacture a
  // deleted table or force a saved scorecard back to two players at render time.
  const rows = table?.rows ?? [];
  const header = table?.hasHeader ? rows[0] : undefined;
  const footer = table?.hasFooter ? rows.at(-1) : undefined;
  const body = rows.slice(header ? 1 : 0, footer ? -1 : undefined);
  const columns = Math.max(0, ...rows.map((row) => row.length));
  const players = Array.from({ length: Math.max(0, columns - 2) }, (_, index) => index + 1);
  const naturalWidth = 140 + players.length * 120;
  const sourceDefaultWidths = table?.columnWidths?.join(",") === "16,28,28,28";
  const authoredWidths = !sourceDefaultWidths && table?.columnWidths?.length === columns ? table.columnWidths : undefined;
  const widthTotal = authoredWidths?.reduce((total, width) => total + width, 0) ?? 0;
  const columnStyle = (column: number) => authoredWidths && widthTotal > 0
    ? { width: `${authoredWidths[column] / widthTotal * naturalWidth}px` }
    : column > 0 && column < columns - 1 ? { width: "120px" } : undefined;
  const rowStyle = (row: number) => table?.rowHeights?.[row] ? { height: `${table.rowHeights[row]}px` } : undefined;
  const updateCell = (row: number, column: number, value: string) => {
    if (!table || context.mode !== "edit") return;
    context.onUpdateBlock?.(table.id, (current) => current.type === "table" ? { ...current, rows: current.rows.map((cells, index) => index === row ? cells.map((cell, cellIndex) => cellIndex === column ? value : cell) : cells) } : current);
  };
  return <>
    <p className="sr-only" role="status" /><p className="score-entry-error" role="alert" />
    {table && columns < 3 ? <div>{renderBlock({ ...context, block: table })}</div> : table ? <div className="table-wrap" {...selected(context, table)}><table className={players.length === 2 ? "two-player-table" : ""} style={{ fontSize: tableFontSize }}>
      <colgroup><col className="hole-col" style={columnStyle(0)} />{players.map((column) => <col key={column} style={columnStyle(column)} />)}<col className="total-col" style={columnStyle(columns - 1)} /></colgroup>
      {header ? <thead><tr style={rowStyle(0)}>{header.map((cell, column) => column > 0 && column < columns - 1 ? <th key={column}>
        <span className="drag-handle" aria-hidden="true">⠿</span>
        <label className="sr-only" htmlFor={`studio-${table.id}-name-${column}`}>Player name</label>
        <input id={`studio-${table.id}-name-${column}`} className="name-input" value={cell} readOnly={context.mode !== "edit"} onChange={(event) => updateCell(0, column, event.target.value)} />
        <span className="player-move"><button type="button" aria-label={`Move ${cell} left`} disabled={column === 1} aria-disabled="true">‹</button><button type="button" aria-label={`Move ${cell} right`} disabled={column === columns - 2} aria-disabled="true">›</button></span>
        <span className="resize-handle" aria-hidden="true" />
      </th> : <th key={column}>{cell}</th>)}</tr></thead> : null}
      <tbody>{body.map((row, rowIndex) => <tr key={rowIndex} style={rowStyle(rowIndex + (header ? 1 : 0))}><th><span className="hole-number">{row[0]}</span></th>{players.map((column) => <td key={column}><label className="sr-only" htmlFor={`studio-${table.id}-${rowIndex}-${column}`}>{header?.[column] ?? `Player ${column}`}, hole {row[0]}</label><span className="score-control"><input id={`studio-${table.id}-${rowIndex}-${column}`} className="score-input" inputMode="numeric" type="tel" value={row[column] ?? ""} readOnly={context.mode !== "edit"} onChange={(event) => updateCell(rowIndex + (header ? 1 : 0), column, event.target.value)} /><span className="score-stepper"><button type="button" aria-disabled="true" aria-label={`Increase ${header?.[column] ?? `Player ${column}`}, hole ${row[0]}`}>▲</button><button type="button" aria-disabled="true" aria-label={`Decrease ${header?.[column] ?? `Player ${column}`}, hole ${row[0]}`}>▼</button></span></span></td>)}<td className="hole-total">{row.at(-1)}</td></tr>)}</tbody>
      {footer ? <tfoot><tr style={rowStyle(rows.length - 1)}>{footer.map((cell, index) => index === 0 ? <th key={index}>{cell}</th> : <td key={index}>{cell}</td>)}</tr></tfoot> : null}
    </table></div> : null}
  </>;
}

function renderBlock(context: Context, parentRole?: Section["role"], tableFontSize = "16px"): ReactNode {
  const block = context.block;
  if (!block) return null;
  if (block.type === "section" && block.role) {
    if (block.role === "scorecard") {
      const findSize = (items: ContentBlock[]): string | undefined => {
        for (const item of items) {
          if (item.type === "field" && item.siteRole === "table-size") return item.value;
          if (item.type === "section" || item.type === "group") { const found = findSize(item.children); if (found) return found; }
        }
      };
      const value = findSize(block.children);
      tableFontSize = value === "Small" ? "13px" : value === "Large" ? "19px" : "16px";
    }
    if (block.role === "leaderboard" && context.runtime) {
      const runtime = context.runtime;
      const templates = block.children.filter(item => item.type === "section" && item.role === "leaderboard-card");
      const template = templates[0];
      const bind = (item: ContentBlock, player: typeof runtime.model.stats[number]): ContentBlock => {
        if ("children" in item && item.children) return { ...item, children: item.children.map(child => bind(child, player)) };
        if (item.type !== "paragraph" && item.type !== "heading") return item;
        let text = item.text;
        if (item.siteRole === "player-name") text = player.name || "Unnamed player";
        if (item.siteRole === "score-value") text = player.total ? String(player.total) : "—";
        if (["metric-value", "metric-average", "metric-deviation", "metric-holes"].includes(item.siteRole ?? "")) {
          if (item.siteRole === "metric-average" || item.id.includes("-metric-1-")) text = golf.formatStat(player.average);
          if (item.siteRole === "metric-deviation" || item.id.includes("-metric-2-")) text = golf.formatStat(player.deviation);
          if (item.siteRole === "metric-holes" || item.id.includes("-metric-3-")) text = `${player.values.length} / ${runtime.game.holes}`;
        }
        return { ...item, text, runs: text === item.text ? item.runs : undefined };
      };
      if (context.mode === "edit") {
        return <section {...selected(context, block, { className: "summary-grid" })}>{block.children.map(item => {
          const player = runtime.model.stats[templates.indexOf(item)];
          return <Fragment key={item.id}>{renderBlock({ ...context, block: player ? bind(item, player) : item, runtimeLeader: Boolean(player && runtime.model.stats.find(stat => stat.values.length)?.id === player.id) }, "leaderboard")}</Fragment>;
        })}</section>;
      }
      return <section {...selected(context, block, { className: "summary-grid" })}>{block.children.map(item => item === template ? runtime.model.stats.map(player => <Fragment key={player.id}>{renderBlock({ ...context, block: bind(template, player), runtimeLeader: runtime.model.stats.find(item => item.values.length)?.id === player.id }, "leaderboard")}</Fragment>) : templates.includes(item) ? null : <Fragment key={item.id}>{renderBlock({ ...context, block: item }, "leaderboard")}</Fragment>)}</section>;
    }
    const children = block.children.map((item) => <Fragment key={item.id}>{renderBlock({ ...context, block: item }, block.role, tableFontSize)}</Fragment>);
    const containers: Partial<Record<NonNullable<Section["role"]>, [string, string]>> = {
      hero: ["header", "hero"], "hero-copy": ["div", ""], account: ["section", "account-bar panel"], "account-copy": ["div", ""],
      setup: ["section", "panel setup"], scorecard: ["section", "panel score-panel"], "scorecard-heading": ["div", "section-heading"], "scorecard-actions": ["div", "heading-actions"],
      leaderboard: ["section", "summary-grid"], "leaderboard-card": ["article", "summary-card"], "leaderboard-score": ["div", "big-score"], "leaderboard-metrics": ["dl", ""], metric: ["div", ""],
      share: ["section", "finish panel"], footer: ["footer", "site-footer"], "footer-brand": ["div", "footer-brand"], "footer-links": ["div", "footer-links"],
    };
    if (block.role === "social-link") {
      const link = block.children.find((item) => item.type === "button");
      const href = link?.type === "button" ? safeTextLink(link.url) : null;
      return <a href={href ?? "#"} {...selected(context, block, { className: "footer-link", "aria-label": link?.type === "button" ? link.label : undefined, target: "_blank", rel: "noopener noreferrer" })} onClick={(event) => { if (context.mode === "edit" || !href) event.preventDefault(); }}>{children}</a>;
    }
    const container = containers[block.role];
    if (container) {
      // Consecutive action buttons share the source wrapper; moving a button
      // across another block still changes the rendered order.
      let content = children;
      if (block.role === "setup" || block.role === "share") {
        content = [];
        for (let index = 0; index < block.children.length; index++) {
          if (block.children[index].type !== "button") { content.push(children[index]); continue; }
          const first = index; const actions = [children[index]];
          while (block.children[index + 1]?.type === "button") actions.push(children[++index]);
          content.push(<div className={block.role === "setup" ? "setup-actions" : "finish-actions"} key={`actions-${first}`}>{actions}</div>);
        }
      }
      return createElement(container[0], selected(context, block, { className: `${container[1]}${block.role === "leaderboard-card" && context.runtimeLeader ? " leader" : ""}` || undefined, "aria-label": typeof block.data?.ariaLabel === "string" ? block.data.ariaLabel : undefined, "data-source-revision": block.role === "hero" ? MINI_GOLF_SOURCE_REVISION : undefined }), content);
    }
  }
  if (block.type === "table" && parentRole === "scorecard") return renderScoreTable(context, block, tableFontSize);
  if (block.type === "image" && (block.siteRole === "logo" || block.siteRole === "social-icon")) {
    const safe = /^(https?:\/\/|\/(?!\/))/.test(block.src) ? block.src : "";
    const className = block.siteRole === "social-icon" ? "footer-social-icon" : parentRole === "hero" ? "logo-mark" : "footer-mark";
    return createElement(parentRole === "hero" ? "div" : "span", selected(context, block, { className, role: block.alt ? "img" : undefined, "aria-label": block.alt || undefined, "aria-hidden": block.alt ? undefined : true, style: { backgroundImage: safe ? `url(${JSON.stringify(safe)})` : "none" } }));
  }
  if (block.type === "heading" || block.type === "paragraph") {
    if (block.siteRole === "progress" && context.runtime) return <span {...selected(context, block, { className: "progress" })}>{Array.from({ length: context.runtime.game.holes }, (_, hole) => golf.isHoleComplete(context.runtime!.game, hole)).filter(Boolean).length} / {context.runtime.game.holes} holes complete</span>;
    let tag = block.type === "heading" ? `h${block.level}` : "p";
    const classNames: Partial<Record<NonNullable<ContentBlock["siteRole"]>, string>> = { eyebrow: "eyebrow", status: "account-status", progress: "progress", "score-value": "score-value" };
    if (["progress", "score-value", "footer-name"].includes(block.siteRole ?? "")) tag = "span";
    if (block.siteRole === "player-name") tag = "h3";
    if (block.siteRole === "score-label") tag = "span";
    if (block.siteRole === "metric-label") tag = "dt";
    if (["metric-value", "metric-average", "metric-deviation", "metric-holes"].includes(block.siteRole ?? "")) tag = "dd";
    if (block.siteRole === "score-value" && context.mode === "preview" && !block.align && (block.type !== "paragraph" || !block.style)) return renderText(block.text, block.runs);
    let presentedBlock = block;
    if (block.siteRole === "title" && block.text.toLowerCase() === "mini golf scorecard" && !block.runs?.some((run) => run.marks?.includes("italic"))) {
      // The source brand emphasises Scorecard even after a plain-text edit.
      // Split only at the brand boundary and retain all other authored marks.
      let offset = 0;
      const runs = (block.runs?.length ? block.runs : [{ text: block.text }]).flatMap((run) => {
        const start = offset; offset += run.text.length;
        const boundary = Math.max(0, Math.min(run.text.length, 10 - start));
        return [
          ...(boundary ? [{ ...run, text: run.text.slice(0, boundary) }] : []),
          ...(boundary < run.text.length ? [{ ...run, text: run.text.slice(boundary), marks: [...(run.marks ?? []), "italic" as const] }] : []),
        ];
      });
      presentedBlock = { ...block, runs };
    }
    const content = editableText(context, presentedBlock, tag, block.siteRole ? classNames[block.siteRole] : undefined);
    if (block.siteRole === "player-name") return <div className="card-top">{content}{context.runtimeLeader ? <span className="leader-badge">Leading</span> : null}</div>;
    if ((parentRole === "scorecard-heading" || parentRole === "share") && block.type === "heading") return <div>{content}</div>;
    return content;
  }
  if (block.type === "field") {
    if (block.siteRole === "table-size" && context.runtime) return <label {...selected(context, block, { className: "table-size-control" })}>{block.label}<select value={context.runtime.tableSize} onChange={event => context.runtime?.setTableSize(event.target.value as "small" | "medium" | "large")}><option value="small">Small</option><option value="medium">Standard</option><option value="large">Large</option></select></label>;
    if (block.siteRole === "table-size") return <label {...selected(context, block, { className: "table-size-control", htmlFor: `studio-${block.id}` })}>{block.label}<select id={`studio-${block.id}`} value={block.value} aria-disabled={context.mode !== "edit"} onChange={(event) => { if (context.mode !== "edit") return; const value = event.target.value; context.onUpdateBlock?.(block.id, (current) => current.type === "field" ? { ...current, value } : current); }}>{(block.options ?? [block.value]).map((option) => <option key={option}>{option}</option>)}</select></label>;
    return field(context, block, `studio-${block.id}`);
  }
  if (block.type === "button") {
    if (block.siteRole === "social-action") return context.mode === "preview" ? null : <span {...selected(context, block, { className: "sr-only" })}>{block.label}</span>;
    if (parentRole === "account") return <a href={safeTextLink(block.url) ?? "#"} {...selected(context, block, { className: `button ${block.style}`, "aria-disabled": true })} onClick={(event) => event.preventDefault()}>{block.label}</a>;
    return action(context, block, `button ${block.siteRole === "auto-resize" ? "compact-toggle" : block.siteRole === "new-game" ? "ghost" : block.style}`);
  }
  if (context.mode === "preview") return <BlockRenderer blocks={[block]} variant="studio" hideDividers />;
  return <div {...selected(context, block)}><BlockField block={block} selectedBlockId={context.selectedBlockId} hoveredBlockId={context.hoveredBlockId} onTableCellFocus={() => context.onSelectBlock?.(block.id)} onTextSelection={() => undefined} onLinkActivate={() => undefined} onChange={(next) => context.onUpdateBlock?.(block.id, () => next)} /></div>;
}

function ConnectedBlock({ context }: { context: Context }) {
  const runtime = useMiniGolfRuntime();
  return renderBlock({ ...context, runtime });
}
export const miniGolfPresentation: StudioPresentation = { renderHeader: () => <></>, renderBlock: context => <ConnectedBlock context={context} />,  showPublicationDetails: false, allowCoverImage: false };
