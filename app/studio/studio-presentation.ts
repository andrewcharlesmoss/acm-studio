import type { ReactNode } from "react";
import type { ContentBlock } from "../content/model";
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
};

export type StudioPresentation = {
  renderHeader?: (context: Omit<StudioPresentationContext, "block">) => ReactNode;
  renderBlock?: (context: StudioPresentationContext) => ReactNode | null;
  renderFooter?: (context: Omit<StudioPresentationContext, "block">) => ReactNode;
  showPublicationDetails?: boolean;
  allowCoverImage?: boolean;
};
