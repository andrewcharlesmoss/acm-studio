"use client";

import { tableRowSections } from "../../../content/table-row-sections";
import { StudioAnchoredMenu } from "../../overlays/anchored-menu";
import { TableCaptionControl, useTableCaption } from "../../table-caption-control";
import { tablePresentation } from "../../../content/table-presentation";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { AcmIcon } from "@acm/icons/react";
import { TableActionIcon, TableIcon, type TableAction } from "../../table-icons";
import { textToRuns } from "../../../content/rich-text";
import { normaliseTableColumnWidths, type ContentBlock, type RichTextRun } from "../../../content/model";
import { blockAlignmentClass } from "../../../content/block-alignment";
import { validTableActiveCell, applyTableStructureAction } from "../../../content/table-actions";
import { tableCellMetadataAt, tableCellScopeFor, tableCellTagFor } from "../../../content/table-cell-metadata";
import { type TableCell } from "../../table-text-target";
import { focusRichTextEditorAtOffset, RichTextEditor, type TextSelection } from "./rich-text";

export function TableField({ block, mediaUrls = {}, writable = true, showCaptionControl = false, onCellFocus, onCaptionFocus, onTextSelection, onLinkActivate, onChange }: { block: Extract<ContentBlock, { type: "table" }>; mediaUrls?: Record<string, string>; writable?: boolean; showCaptionControl?: boolean; onCellFocus: (rowIndex: number, columnIndex: number) => void; onCaptionFocus: () => void; onTextSelection: (selection: TextSelection | null, rowIndex?: number, columnIndex?: number) => void; onLinkActivate: (selection: TextSelection, rowIndex?: number, columnIndex?: number) => void; onChange: (block: ContentBlock) => void }) {
  const rows = block.rows.length ? block.rows : [[""]];
  const columnCount = Math.max(1, ...rows.map((row) => row.length));
  const normalisedRows = rows.map((row) => Array.from({ length: columnCount }, (_, index) => row[index] ?? ""));
  const captionId = useId();
  const captionRef = useRef<HTMLElement>(null);
  const caption = useTableCaption(block);
  useLayoutEffect(() => {
    if (caption.focusRequested && caption.visible) {
      captionRef.current?.querySelector<HTMLElement>(".table-caption-editor")?.focus();
      caption.focusHandled();
    }
  }, [caption]);
  const tableRef = useRef<HTMLTableElement>(null);
  const [initialColumnCount, setInitialColumnCount] = useState("2");
  const [initialRowCount, setInitialRowCount] = useState("2");
  const columnWidths = normaliseTableColumnWidths(columnCount, block.columnWidths);
  const rowHeights = block.rowHeights;
  const { headerRowCount, footerRowCount, bodyStart, bodyEnd } = tableRowSections(block);

  function updateCell(rowIndex: number, columnIndex: number, value: string, runs: RichTextRun[]) {
    const nextRows = normalisedRows.map((row) => [...row]);
    nextRows[rowIndex][columnIndex] = value;
    const nextCellRuns = block.rows.map((row, sourceRow) => row.map((_cell, sourceColumn) => block.cellRuns?.[sourceRow]?.[sourceColumn] ?? textToRuns(block.rows[sourceRow][sourceColumn])));
    nextCellRuns[rowIndex][columnIndex] = runs;
    const hasMarks = nextCellRuns.some((row) => row.some((cellRuns) => cellRuns.some((run) => run.inline || run.marks?.length)));
    onChange({ ...block, rows: nextRows, cellRuns: hasMarks ? nextCellRuns : undefined });
  }

  function renderRow(row: string[], rowIndex: number, section: "header" | "body" | "footer") {
    const defaultTag = section === "header" ? "th" : "td";
    return (
      <tr key={`row-${rowIndex}`} style={rowHeights?.[rowIndex] ? { height: rowHeights[rowIndex] } : undefined}>
        {row.map((cell, columnIndex) => {
          const metadata = tableCellMetadataAt(block.cellMetadata, rowIndex, columnIndex);
          const Cell = tableCellTagFor(metadata, defaultTag) === "th" ? "th" : "td";
          return <Cell key={columnIndex} scope={tableCellScopeFor(metadata, defaultTag)} style={{ textAlign: block.columnAlignments?.[columnIndex] === "centre" ? "center" : block.columnAlignments?.[columnIndex] ?? "left" }}>
            <RichTextEditor
              key={JSON.stringify([block.id, headerRowCount, footerRowCount, block.rows.map(row => row.length)])}
              className="table-cell-editor"
              mediaUrls={mediaUrls}
              text={cell}
              runs={block.cellRuns?.[rowIndex]?.[columnIndex]}
              onFocus={() => { onCellFocus(rowIndex, columnIndex); onTextSelection(null, rowIndex, columnIndex); }}
              onChange={(text, runs) => updateCell(rowIndex, columnIndex, text, runs)}
              onSelectionChange={(selection) => onTextSelection(selection, rowIndex, columnIndex)}
              onLinkActivate={(selection) => onLinkActivate(selection, rowIndex, columnIndex)}
              data-studio-block-id={block.id}
              data-table-cell-row={rowIndex}
              data-table-cell-column={columnIndex}
              data-placeholder={section === "header" ? "Header label" : section === "footer" ? "Footer label" : undefined}
              aria-label={section === "body" ? `Table row ${rowIndex - bodyStart + 1}, column ${columnIndex + 1}` : (section === "header" ? headerRowCount : footerRowCount) > 1 ? `Table ${section} row ${rowIndex - (section === "footer" ? bodyEnd : 0) + 1}, column ${columnIndex + 1}` : `Table ${section} ${columnIndex + 1}`}
            />
          </Cell>;
        })}
      </tr>
    );
  }

  if (!block.rows.length) return <div className="table-placeholder" data-studio-nested-block-id={block.id}>
    <div className="table-placeholder-heading"><AcmIcon name="block.table" scale="Regular-M" size={24} /><strong>Table</strong></div>
    <p>Insert a table for sharing data.</p>
    <form onSubmit={event => {
      event.preventDefault();
      const columns = Number(initialColumnCount || 2);
      const rowCount = Number(initialRowCount || 2);
      if (!Number.isInteger(columns) || !Number.isInteger(rowCount) || columns < 1 || rowCount < 1 || columns > 100 || rowCount > 100) return;
      onChange({ ...block, rows: Array.from({ length: rowCount }, () => Array.from({ length: columns }, () => "")), hasHeader: undefined, hasFooter: undefined, headerRowCount: undefined, footerRowCount: undefined, cellRuns: undefined, cellMetadata: undefined, columnWidths: undefined, rowHeights: undefined, columnAlignments: undefined });
      requestAnimationFrame(() => tableRef.current?.querySelector<HTMLElement>(".table-cell-editor")?.focus());
    }}>
      <label><span>Column count</span><input type="number" min="1" max="100" step="1" value={initialColumnCount} onChange={event => setInitialColumnCount(event.target.value)} /></label>
      <label><span>Row count</span><input type="number" min="1" max="100" step="1" value={initialRowCount} onChange={event => setInitialRowCount(event.target.value)} /></label>
      <button type="submit">Create Table</button>
    </form>
  </div>;

  return (
    <figure className={`table-field${tablePresentation(block.visualStyle).hasBorder ? " has-table-border" : ""}${block.tableStyle === "stripes" ? " is-striped" : ""}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`} data-studio-nested-block-id={block.id}>
      {showCaptionControl ? <div className="table-caption-actions"><TableCaptionControl block={block} writable={writable} onChange={onChange} /></div> : null}
      <table className={`table-field-grid${block.fixedWidth === false ? " is-auto-layout" : ""}`} style={tablePresentation(block.visualStyle).table} aria-labelledby={block.caption ? captionId : undefined} ref={tableRef}>
        {block.fixedWidth !== false ? <colgroup>{columnWidths.map((width, index) => <col key={`column-${index}`} style={{ width: `${width}%` }} />)}</colgroup> : null}
        {headerRowCount ? <thead>{normalisedRows.slice(0, headerRowCount).map((row, index) => renderRow(row, index, "header"))}</thead> : null}
        <tbody>{normalisedRows.slice(bodyStart, bodyEnd).map((row, index) => renderRow(row, index + bodyStart, "body"))}</tbody>
        {footerRowCount ? <tfoot>{normalisedRows.slice(bodyEnd).map((row, index) => renderRow(row, index + bodyEnd, "footer"))}</tfoot> : null}
      </table>
        {caption.visible ? <figcaption id={captionId} ref={captionRef}><RichTextEditor mediaUrls={mediaUrls} as="span" className="table-caption-editor" text={block.caption ?? ""} runs={block.captionRuns} onFocus={onCaptionFocus} onChange={(caption, captionRuns) => onChange({ ...block, caption: caption || undefined, captionRuns: captionRuns.length ? captionRuns : undefined })} onSelectionChange={onTextSelection} onLinkActivate={onLinkActivate} data-studio-block-id={block.id} data-placeholder="Add caption" aria-label="Table caption" /></figcaption> : null}
    </figure>
  );
}

/** The same Gutenberg-style table action menu used by top-level tables. */
function focusTableCell(blockId: string, cell: TableCell) {
  requestAnimationFrame(() => {
    const editor = [...document.querySelectorAll<HTMLElement>(".table-cell-editor[data-studio-block-id]")].find(element =>
      element.dataset.studioBlockId === blockId && element.dataset.tableCellRow === String(cell.rowIndex) && element.dataset.tableCellColumn === String(cell.columnIndex));
    if (editor) focusRichTextEditorAtOffset(editor, 0);
  });
}

export function TableControls({ block, activeCell, writable = true, protectEdges = false, onActiveCellChange, onChange }: { block: Extract<ContentBlock, { type: "table" }>; activeCell?: TableCell | null; writable?: boolean; protectEdges?: boolean; onActiveCellChange?: (cell: TableCell | null) => void; onChange: (block: ContentBlock) => void }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = validTableActiveCell(block, activeCell);
  const { bodyStart, bodyEnd } = tableRowSections(block);
  const rowProtected = selected && protectEdges && (activeCell.rowIndex < bodyStart || activeCell.rowIndex >= bodyEnd);
  const columnProtected = selected && protectEdges && (activeCell.columnIndex === 0 || activeCell.columnIndex === block.rows[0].length - 1);
  function apply(action: TableAction) {
    if (!writable || !selected || (action === "delete-row" && rowProtected) || (action === "delete-column" && columnProtected)) return;
    const result = applyTableStructureAction(block, action, activeCell);
    if (!result) return;
    onChange(result.block);
    onActiveCellChange?.(result.activeCell);
    setOpen(false);
    trigger.current?.focus();
    if (result.activeCell) focusTableCell(block.id, result.activeCell);
  }
  const actions: Array<[TableAction, string]> = [["insert-row-before", "Insert row before"], ["insert-row-after", "Insert row after"], ["delete-row", "Delete row"], ["insert-column-before", "Insert column before"], ["insert-column-after", "Insert column after"], ["delete-column", "Delete column"]];
  if (!block.rows.length) return null;
  return <div className="table-control"><button ref={trigger} className={`table-control-button${open ? " is-active" : ""}`} type="button" onMouseDown={event => event.preventDefault()} onClick={() => { setOpen(!open); if (open) trigger.current?.focus(); }} aria-haspopup="menu" aria-expanded={open} aria-label="Table options" title="Table options"><TableIcon /></button>{open ? <StudioAnchoredMenu anchor={() => trigger.current} className="table-menu" aria-label="Table options" onClose={restoreFocus => { setOpen(false); if (restoreFocus !== false) trigger.current?.focus(); }}>{actions.map(([action, label]) => {
    const protectedAction = (action === "delete-row" && rowProtected) || (action === "delete-column" && columnProtected);
    return <button type="button" role="menuitem" key={action} onMouseDown={event => event.preventDefault()} onClick={() => apply(action)} disabled={!writable || !selected || protectedAction} title={protectedAction ? "Scorecard header, footer and boundary columns are kept intact." : undefined}><TableActionIcon action={action} /><span>{label}</span></button>;
  })}</StudioAnchoredMenu> : null}</div>;
}
