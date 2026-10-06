"use client";

import type { ContentBlock, RichTextRun } from "../../../content/model";
import { blockAlignmentClass } from "../../../content/block-alignment";
import { fitTextEnabled, paragraphStyleAnchor, paragraphStyleClassName, paragraphStyleToCss } from "../../../content/paragraph-styles";
import { RichTextEditor, type RichTextEditorProps } from "../editors/rich-text";
import type { BlockCommandFocusTarget } from "../../block-command-focus";

export function ParagraphEditField({ block, previousParagraphIndent, onChange, onSelectionChange, onLinkActivate, onSplitParagraph, onMergeParagraphBackward, onSplitParagraphs, navigationRootRef, mediaUrls = {}, ariaLabel = "Paragraph text" }: {
  block: Extract<ContentBlock, { type: "paragraph" }>;
  previousParagraphIndent?: string;
  onChange: (block: Extract<ContentBlock, { type: "paragraph" }>) => void;
  onSelectionChange: RichTextEditorProps["onSelectionChange"];
  onLinkActivate: RichTextEditorProps["onLinkActivate"];
  onSplitParagraph?: (blockId: string, beforeRuns: RichTextRun[], afterRuns: RichTextRun[]) => string | null;
  onMergeParagraphBackward?: (blockId: string) => { blockId: string; offset: number } | null;
  onSplitParagraphs?: (blockId: string, paragraphs: RichTextRun[][]) => string[] | null;
  onExitList?: (blockId: string, itemIndex: number, operation?: "return" | "backward" | "forward", listId?: string) => BlockCommandFocusTarget;
  navigationRootRef?: RichTextEditorProps["navigationRootRef"];
  mediaUrls?: Record<string, string>;
  ariaLabel?: string;
}) {
  const classes = paragraphStyleClassName(block.style, block.align);
  return <RichTextEditor
    mediaUrls={mediaUrls}
    id={paragraphStyleAnchor(block.style)}
    className={`block-textarea paragraph-field align-${block.align ?? "left"}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}${classes ? ` ${classes}` : ""}`}
    style={paragraphStyleToCss(block.style, undefined, previousParagraphIndent) as React.CSSProperties}
    fitText={fitTextEnabled(block.style)}
    text={block.text}
    runs={block.runs}
    onChange={(text, runs) => onChange({ ...block, text, runs })}
    onSelectionChange={onSelectionChange}
    onLinkActivate={onLinkActivate}
    onSplitParagraph={onSplitParagraph ? (beforeRuns, afterRuns) => onSplitParagraph(block.id, beforeRuns, afterRuns) : undefined}
    onMergeParagraphBackward={onMergeParagraphBackward ? () => onMergeParagraphBackward(block.id) : undefined}
    onSplitParagraphs={onSplitParagraphs ? paragraphs => onSplitParagraphs(block.id, paragraphs) : undefined}
    navigationRootRef={navigationRootRef}
    data-studio-block-id={block.id}
    data-placeholder="Paragraph"
    aria-label={ariaLabel}
  />;
}
