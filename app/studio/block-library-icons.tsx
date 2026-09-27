import type { IconName, IconScale } from "@acm/icons";
import { AcmIcon } from "@acm/icons/react";
import type { BlockLibraryItemType } from "./editor-model";
import type { ContentBlock } from "../content/model";
import { AcmStudioIcon } from "./acm-studio-icons";
import { StudioIcon, type StudioIconName } from "./studio-icons";

type SharedSymbol = { source: "ACM Icons"; symbol: IconName };
type StudioSymbol = { source: "ACM Studio"; symbol: StudioIconName };
type BlockSymbol = SharedSymbol | StudioSymbol;
type BlockIconType = ContentBlock["type"] | "template-content";

const blockSymbols: Record<BlockIconType, BlockSymbol> = {
  "template-content": { source: "ACM Studio", symbol: "block" },
  group: { source: "ACM Icons", symbol: "arrange.group" },
  columns: { source: "ACM Icons", symbol: "layout.columns" },
  column: { source: "ACM Icons", symbol: "layout.columns" },
  component: { source: "ACM Studio", symbol: "block" },
  section: { source: "ACM Studio", symbol: "block" },
  paragraph: { source: "ACM Icons", symbol: "text.paragraph" },
  heading: { source: "ACM Studio", symbol: "heading-marker" },
  list: { source: "ACM Icons", symbol: "text.list-bulleted" },
  quote: { source: "ACM Icons", symbol: "text.quote" },
  table: { source: "ACM Icons", symbol: "table.cell" },
  code: { source: "ACM Icons", symbol: "text.code" },
  footnotes: { source: "ACM Icons", symbol: "text.footnote" },
  image: { source: "ACM Icons", symbol: "insert.image" },
  embed: { source: "ACM Icons", symbol: "action.link" },
  button: { source: "ACM Studio", symbol: "button" },
  field: { source: "ACM Icons", symbol: "insert.text" },
  divider: { source: "ACM Studio", symbol: "separator" },
  spacer: { source: "ACM Studio", symbol: "spacer" },
  "document-title": { source: "ACM Icons", symbol: "text.heading" },
  "document-subtitle": { source: "ACM Icons", symbol: "text.paragraph" },
  "cover-image": { source: "ACM Icons", symbol: "document.cover" },
  "reading-time": { source: "ACM Studio", symbol: "clock" },
  "post-author": { source: "ACM Icons", symbol: "account.record" },
  "post-date": { source: "ACM Studio", symbol: "calendar" },
};

export function blockLibrarySymbol(type: BlockLibraryItemType): BlockSymbol {
  return blockSymbols[type];
}

export function BlockLibraryIcon({ type }: { type: BlockIconType }) {
  const entry = blockSymbols[type];
  if (entry.source === "ACM Icons") return <AcmIcon name={entry.symbol} scale="Regular-M" size={24} />;
  return <StudioIcon name={entry.symbol} />;
}

export function BlockLibraryIconSample({ type, size, scale }: { type: BlockLibraryItemType; size: number; scale: IconScale }) {
  const entry = blockSymbols[type];
  if (entry.source === "ACM Icons") return <AcmIcon name={entry.symbol} scale={scale} size={size} />;
  return <AcmStudioIcon name={entry.symbol} size={size} />;
}
