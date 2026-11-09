import type { ParagraphStyle } from "../../content/model";
import { blockLayoutItemStyle } from "../../content/layout";
import { groupGridResponsiveCss } from "../../content/grid-child-sizing";

export function GroupGridResponsiveStyles({ parent }: { parent: { id: string; type: string; layout?: string; gridMode?: string; minColumnWidth?: number; minColumnWidthUnit?: string; children: { type: string; style?: unknown; visualStyle?: ParagraphStyle }[] } }) {
  const css = groupGridResponsiveCss(parent, parent.children.map(blockLayoutItemStyle));
  return css ? <style>{css}</style> : null;
}
