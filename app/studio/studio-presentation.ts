import type { ReactNode } from "react";
import type { ContentBlock, ListItemSelection, RichTextRun } from "../content/model";
import type { StudioDocument } from "./editor-model";
import type { BlockCommandFocusTarget } from "./block-command-focus";
import type { SpacerOrientation } from "../content/spacer";

/** Presentation overrides do not replace the Canvas's editing ownership. */
export type StudioEditableBlockOptions = {
  document?: StudioDocument;
  templatePlaceholder?: boolean;
  spacerOrientation?: SpacerOrientation;
};

export type StudioPresentationContext = {
  document: StudioDocument;
  block?: ContentBlock;
  mode: "edit" | "preview";
  writable?: boolean;
  mediaUrls?: Record<string, string>;
  onDocumentFieldChange: <K extends keyof StudioDocument>(field: K, value: StudioDocument[K]) => void;
  onFocusDocumentField: (field?: "title" | "subtitle") => void;
  selectedDocumentField?: "title" | "subtitle" | null;
  selectedBlockId?: string | null;
  hoveredBlockId?: string | null;
  onTextSelection?: (blockId: string, selection: { start: number; end: number } | null, rowIndex?: number, columnIndex?: number) => void;
  onLinkActivate?: (blockId: string, selection: { start: number; end: number }, rowIndex?: number, columnIndex?: number) => void;
  onTableCellFocus?: (blockId: string, rowIndex: number, columnIndex: number) => void;
  onSelectListItem?: (selection: ListItemSelection) => void;
  onSelectBlock?: (blockId: string) => void;
  onUpdateBlock?: (blockId: string, update: (block: ContentBlock) => ContentBlock) => void;
  /** Reuse the canonical toolbar when a presentation renders nested fields. */
  renderBlockControls?: (block: ContentBlock) => ReactNode;
  /** Render an adapted block through the Canvas's complete editing contract. */
  renderEditableBlock?: (block: ContentBlock, options?: StudioEditableBlockOptions) => ReactNode;
  onSplitParagraphs?: (blockId: string, paragraphs: RichTextRun[][]) => string[] | null;
  onExitList?: (blockId: string, itemIndex: number, operation?: "return" | "backward" | "forward", listId?: string) => BlockCommandFocusTarget;
};

export type StudioPresentation = {
  /** Composes the canonical editable body inside a site template. */
  renderDocument?: (context: Omit<StudioPresentationContext, "block">, content: ReactNode) => ReactNode;
  renderHeader?: (context: Omit<StudioPresentationContext, "block">) => ReactNode;
  renderBlock?: (context: StudioPresentationContext) => ReactNode | null;
  renderFooter?: (context: Omit<StudioPresentationContext, "block">) => ReactNode;
  showPublicationDetails?: boolean;
  allowCoverImage?: boolean;
  /** Legacy previews hide top-level dividers; templates explicitly display them. */
  hideDividers?: boolean;
};
