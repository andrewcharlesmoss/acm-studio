import type { ContentBlock, ParagraphStyle } from "../../content/model";

type GroupBlock = Extract<ContentBlock, { type: "group" }>;

/** Keep single-control resets separate from the whole Dimensions section reset. */
export function resetGroupDimensionFields(block: GroupBlock, style: ParagraphStyle, { padding, layout }: { padding: boolean; layout: boolean }): GroupBlock {
  return {
    ...block,
    ...(padding ? { paddingX: undefined, paddingY: undefined } : {}),
    ...(layout ? { gap: undefined, columnGap: undefined, rowGap: undefined } : {}),
    visualStyle: Object.keys(style).length ? style : undefined,
  };
}
