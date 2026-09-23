import type { ReactNode } from "react";
import type { ContentBlock, RichTextRun } from "../content/model";
import type { StudioDocument } from "./editor-model";

export type StudioPresentationContext = {
  document: StudioDocument;
  block?: ContentBlock;
  mode: "edit" | "preview";
  onDocumentFieldChange: <K extends keyof StudioDocument>(field: K, value: StudioDocument[K]) => void;
  onFocusDocumentField: () => void;
  selectedBlockId?: string | null;
  hoveredBlockId?: string | null;
  onTableCellFocus?: (blockId: string, rowIndex: number, columnIndex: number) => void;
  onSelectBlock?: (blockId: string) => void;
  onUpdateBlock?: (blockId: string, update: (block: ContentBlock) => ContentBlock) => void;
  onSplitParagraphs?: (blockId: string, paragraphs: RichTextRun[][]) => string[] | null;
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
