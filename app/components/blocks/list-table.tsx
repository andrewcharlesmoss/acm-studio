import { tableRowSections } from "../../content/table-row-sections";
import { tablePresentation } from "../../content/table-presentation";
import { useId } from "react";
import { listItemText, listMarker, normaliseTableColumnWidths, type ContentBlock } from "../../content/model";
import { listItemTextStyle, paragraphStyleAnchor, paragraphStyleClassName, paragraphStyleToCss, visualStyleClassName } from "../../content/paragraph-styles";
import { blockAlignmentClass } from "../../content/block-alignment";
import { tableCellMetadataAt, tableCellScopeFor, tableCellTagFor } from "../../content/table-cell-metadata";
import { renderText } from "./rich-text";

export function renderListBlock(block: Extract<ContentBlock, { type: "list" }>, studio: boolean, mediaUrls: Record<string, string>, footnoteNumbers: Map<string, number>, renderChild: (child: Extract<ContentBlock, { type: "list" }>) => React.ReactNode): React.ReactNode {
  const items = block.items.map((item, index) => {
    const content = typeof item === "string" ? item : renderText(listItemText(item), item.runs, mediaUrls, footnoteNumbers, { blockId: block.id, kind: "list-item", itemIndex: index });
    const nestedLists = typeof item === "string" ? null : item.children?.filter(child => !child.editorial?.hidden).map(child => renderChild(child));
    const itemStyle = typeof item === "string" ? undefined : item.style;
    const itemPresentation = { id: paragraphStyleAnchor(itemStyle), className: paragraphStyleClassName(itemStyle) || undefined, style: paragraphStyleToCss(itemStyle) as React.CSSProperties };
    const itemTextStyle = listItemTextStyle(itemStyle) as React.CSSProperties;
    return studio
      ? <li {...itemPresentation} className={`list-field-row${itemStyle ? ` ${visualStyleClassName(itemStyle)}` : ""}`} key={`${block.id}-${index}`}><span className="list-field-marker" aria-hidden="true">{block.style === "ordered" ? listMarker(block, index) : "•"}</span><div className="list-field-item-content"><span className="list-item-text" style={itemTextStyle}>{content}</span>{nestedLists}</div></li>
      : <li {...itemPresentation} key={`${block.id}-${index}`}>{itemStyle ? <span style={itemTextStyle}>{content}</span> : content}{nestedLists}</li>;
  });
  return block.style === "ordered"
    ? <ol className={[studio ? "list-field-preview" : "", blockAlignmentClass(block)].filter(Boolean).join(" ") || undefined} type={block.marker} start={block.start} reversed={block.reversed || undefined} key={block.id}>{items}</ol>
    : <ul className={[studio ? "list-field-preview" : "", blockAlignmentClass(block)].filter(Boolean).join(" ") || undefined} key={block.id}>{items}</ul>;
}

export function ContentTable({ block, mediaUrls, footnoteNumbers }: { block: Extract<ContentBlock, { type: "table" }>; mediaUrls: Record<string, string>; footnoteNumbers: Map<string, number> }) {
  const captionId = useId();
  const rows = block.rows;
  const columnCount = Math.max(1, ...rows.map((row) => row.length));
  const normalisedRows = rows.map((row) => Array.from({ length: columnCount }, (_, index) => row[index] ?? ""));
  const columnWidths = normaliseTableColumnWidths(columnCount, block.columnWidths);
  const rowHeights = block.rowHeights;
  const { headerRowCount, footerRowCount, bodyStart, bodyEnd } = tableRowSections(block);
  const headerRows = normalisedRows.slice(0, headerRowCount);
  const footerRows = footerRowCount ? normalisedRows.slice(bodyEnd) : [];


  function renderRow(row: string[], rowIndex: number, header = false) {
    const defaultTag = header ? "th" : "td";
    return (
      <tr key={rowIndex} className={rowHeights?.[rowIndex] ? "has-explicit-row-height" : undefined} style={rowHeights?.[rowIndex] ? { height: rowHeights[rowIndex] } : undefined}>
        {row.map((cell, cellIndex) => {
          const metadata = tableCellMetadataAt(block.cellMetadata, rowIndex, cellIndex);
          const Cell = tableCellTagFor(metadata, defaultTag) === "th" ? "th" : "td";
          return <Cell key={cellIndex} scope={tableCellScopeFor(metadata, defaultTag)} style={block.columnAlignments?.[cellIndex] && block.columnAlignments[cellIndex] !== "left" ? { textAlign: block.columnAlignments[cellIndex] === "centre" ? "center" : block.columnAlignments[cellIndex] } : undefined}>
            {/* Scroll containers need keyboard focus without pretending to be editable controls. */}
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
            <div className="content-table-cell" tabIndex={cell ? 0 : undefined}>
              {renderText(cell, block.cellRuns?.[rowIndex]?.[cellIndex], mediaUrls, footnoteNumbers, { blockId: block.id, kind: "table-cell", row: rowIndex, column: cellIndex })}
            </div>
          </Cell>;
        })}
      </tr>
    );
  }

  if (!rows.length) return null;

  return (
    <figure className={`content-table-frame${tablePresentation(block.visualStyle).hasBorder ? " has-table-border" : ""}${block.tableStyle === "stripes" ? " is-striped" : ""}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}`}>
      <table className={`content-table${block.fixedWidth === false ? " is-auto-layout" : ""}`} style={tablePresentation(block.visualStyle).table} aria-labelledby={block.caption ? captionId : undefined}>
        {block.fixedWidth !== false ? <colgroup>{columnWidths.map((width, index) => <col key={`column-${index}`} style={{ width: `${width}%` }} />)}</colgroup> : null}
        {headerRows.length ? <thead>{headerRows.map((row, index) => renderRow(row, index, true))}</thead> : null}
        <tbody>{normalisedRows.slice(bodyStart, bodyEnd).map((row, index) => renderRow(row, index + bodyStart))}</tbody>
        {footerRows.length ? <tfoot>{footerRows.map((row, index) => renderRow(row, normalisedRows.length - footerRows.length + index))}</tfoot> : null}
      </table>
      {block.caption ? <figcaption id={captionId}>{renderText(block.caption, block.captionRuns, mediaUrls, footnoteNumbers, { blockId: block.id, kind: "caption" })}</figcaption> : null}
    </figure>
  );
}
