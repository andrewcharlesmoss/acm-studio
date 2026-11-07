import type { GroupVariationType } from "./blocks/group-variations";
import type { IconName, IconScale } from "@acm/icons";
import { AcmIcon } from "@acm/icons/react";
import type { ContentBlock } from "../content/model";
import { coreSocialServiceIcon, socialServiceFromInsertType, type SocialServiceInsertType } from "../content/social-services";

type SharedSymbol = { source: "ACM Icons"; symbol: IconName };
type BlockSymbol = SharedSymbol;
export type BlockIconType = ContentBlock["type"] | "template-content" | "navigation" | "page-link" | "site-title" | GroupVariationType | SocialServiceInsertType;

const blockSymbols: Record<Exclude<BlockIconType, SocialServiceInsertType>, BlockSymbol> = {
  "site-title": { source: "ACM Icons", symbol: "site.identity" },
  "page-link": { source: "ACM Icons", symbol: "view.pages" },
  navigation: { source: "ACM Icons", symbol: "navigation.menu" },
  "template-content": { source: "ACM Icons", symbol: "document.content" },
  "query-loop": { source: "ACM Icons", symbol: "block.list" },
  "post-template": { source: "ACM Icons", symbol: "document.content" },
  "no-results": { source: "ACM Icons", symbol: "text.paragraph" },
  row: { source: "ACM Icons", symbol: "layout.row" },
  stack: { source: "ACM Icons", symbol: "layout.stack" },
  grid: { source: "ACM Icons", symbol: "layout.grid" },
  details: { source: "ACM Icons", symbol: "navigation.disclosure" },
  group: { source: "ACM Icons", symbol: "layout.flow" },
  columns: { source: "ACM Icons", symbol: "layout.columns" },
  column: { source: "ACM Icons", symbol: "layout.column" },
  component: { source: "ACM Icons", symbol: "component.block" },
  section: { source: "ACM Icons", symbol: "arrange.group" },
  paragraph: { source: "ACM Icons", symbol: "text.paragraph" },
  heading: { source: "ACM Icons", symbol: "block.heading" },
  list: { source: "ACM Icons", symbol: "block.list" },
  quote: { source: "ACM Icons", symbol: "text.quote" },
  pullquote: { source: "ACM Icons", symbol: "text.quote" },
  table: { source: "ACM Icons", symbol: "block.table" },
  code: { source: "ACM Icons", symbol: "block.code" },
  footnotes: { source: "ACM Icons", symbol: "text.list-numbered" },
  image: { source: "ACM Icons", symbol: "block.image" },
  video: { source: "ACM Icons", symbol: "insert.video" },
  cover: { source: "ACM Icons", symbol: "block.image" },
  embed: { source: "ACM Icons", symbol: "insert.embed" },
  buttons: { source: "ACM Icons", symbol: "insert.button" },
  button: { source: "ACM Icons", symbol: "insert.button" },
  field: { source: "ACM Icons", symbol: "insert.text" },
  separator: { source: "ACM Icons", symbol: "layout.separator" },
  spacer: { source: "ACM Icons", symbol: "layout.spacer" },
  "title": { source: "ACM Icons", symbol: "document.title" },
  "subtitle": { source: "ACM Icons", symbol: "text.paragraph" },
  "cover-image": { source: "ACM Icons", symbol: "document.featured-image" },
  "time-to-read": { source: "ACM Icons", symbol: "time.clock" },
  "author-name": { source: "ACM Icons", symbol: "account.author" },
  "post-date": { source: "ACM Icons", symbol: "document.date" },
  "social-icons": { source: "ACM Icons", symbol: "social.block" },
  "social-link": { source: "ACM Icons", symbol: "social.block" },
  "social-linkedin": { source: "ACM Icons", symbol: "social.service.linkedin" },
  "social-tiktok": { source: "ACM Icons", symbol: "social.service.tiktok" },
};

export function blockLibrarySymbol(type: BlockIconType): BlockSymbol {
  const service = socialServiceFromInsertType(type);
  if (service) return { source: "ACM Icons", symbol: coreSocialServiceIcon(service) };
  return blockSymbols[type as Exclude<BlockIconType, SocialServiceInsertType>];
}

export function BlockLibraryIcon({ type }: { type: BlockIconType }) {
  const entry = blockLibrarySymbol(type);
  const scale = type === "group" || type === "row" || type === "stack" || type === "grid" ? "Regular-L" : "Regular-M";
  return <AcmIcon name={entry.symbol} scale={scale} size={24} />;
}

export function BlockLibraryIconSample({ type, size, scale }: { type: BlockIconType; size: number; scale: IconScale }) {
  const entry = blockLibrarySymbol(type);
  return <AcmIcon name={entry.symbol} scale={scale} size={size} />;
}
