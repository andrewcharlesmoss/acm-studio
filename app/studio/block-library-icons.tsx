import type { GroupVariationType } from "./blocks/group-variations";
import type { IconName, IconScale } from "@acm/icons";
import { AcmIcon } from "@acm/icons/react";
import type { ContentBlock } from "../content/model";

type SharedSymbol = { source: "ACM Icons"; symbol: IconName };
type BlockSymbol = SharedSymbol;
export type BlockIconType = ContentBlock["type"] | "template-content" | GroupVariationType;

const blockSymbols: Record<BlockIconType, BlockSymbol> = {
  "template-content": { source: "ACM Icons", symbol: "document.content" },
  row: { source: "ACM Icons", symbol: "layout.row" },
  stack: { source: "ACM Icons", symbol: "layout.stack" },
  grid: { source: "ACM Icons", symbol: "layout.grid" },
  group: { source: "ACM Icons", symbol: "layout.flow" },
  columns: { source: "ACM Icons", symbol: "layout.columns" },
  column: { source: "ACM Icons", symbol: "layout.column" },
  component: { source: "ACM Icons", symbol: "component.block" },
  section: { source: "ACM Icons", symbol: "arrange.group" },
  paragraph: { source: "ACM Icons", symbol: "text.paragraph" },
  heading: { source: "ACM Icons", symbol: "block.heading" },
  list: { source: "ACM Icons", symbol: "block.list" },
  quote: { source: "ACM Icons", symbol: "text.quote" },
  table: { source: "ACM Icons", symbol: "block.table" },
  code: { source: "ACM Icons", symbol: "block.code" },
  footnotes: { source: "ACM Icons", symbol: "text.list-numbered" },
  image: { source: "ACM Icons", symbol: "block.image" },
  embed: { source: "ACM Icons", symbol: "insert.embed" },
  buttons: { source: "ACM Icons", symbol: "insert.button" },
  button: { source: "ACM Icons", symbol: "insert.button" },
  field: { source: "ACM Icons", symbol: "insert.text" },
  divider: { source: "ACM Icons", symbol: "layout.separator" },
  spacer: { source: "ACM Icons", symbol: "layout.spacer" },
  "document-title": { source: "ACM Icons", symbol: "document.title" },
  "document-subtitle": { source: "ACM Icons", symbol: "text.paragraph" },
  "cover-image": { source: "ACM Icons", symbol: "document.featured-image" },
  "reading-time": { source: "ACM Icons", symbol: "time.clock" },
  "post-author": { source: "ACM Icons", symbol: "account.author" },
  "post-date": { source: "ACM Icons", symbol: "document.date" },
  "social-icons": { source: "ACM Icons", symbol: "social.block" },
  "social-linkedin": { source: "ACM Icons", symbol: "brand.linkedin" },
  "social-tiktok": { source: "ACM Icons", symbol: "brand.tiktok" },
};

export function blockLibrarySymbol(type: BlockIconType): BlockSymbol {
  return blockSymbols[type];
}

export function BlockLibraryIcon({ type }: { type: BlockIconType }) {
  const entry = blockSymbols[type];
  return <AcmIcon name={entry.symbol} scale="Regular-M" size={24} />;
}

export function BlockLibraryIconSample({ type, size, scale }: { type: BlockIconType; size: number; scale: IconScale }) {
  const entry = blockSymbols[type];
  return <AcmIcon name={entry.symbol} scale={scale} size={size} />;
}
