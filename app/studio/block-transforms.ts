import type { ContentBlock, HeadingLevel, TextAlignment } from "../content/model";
import type { StudioIconName } from "./studio-icons";

export type BlockTransform = { id: string; label: string; icon: StudioIconName; target: "heading" | "list" | "paragraph" | "quote"; level?: HeadingLevel };

function textFromBlock(block: ContentBlock) {
  if (block.type === "paragraph" || block.type === "heading" || block.type === "quote") return block.text;
  if (block.type === "list") return block.items.join("\n");
  if (block.type === "code") return block.code;
  if (block.type === "button") return block.label;
  return "";
}

function headingTransforms(excludeLevel?: HeadingLevel): BlockTransform[] {
  return ([1, 2, 3, 4, 5, 6] as HeadingLevel[]).filter((level) => level !== excludeLevel).map((level) => ({ id: `heading-${level}`, label: `Heading ${level}`, icon: "heading", target: "heading", level }));
}

export function availableBlockTransforms(block: ContentBlock): BlockTransform[] {
  if (block.type === "heading") return [...headingTransforms(block.level), { id: "paragraph", label: "Paragraph", icon: "paragraph", target: "paragraph" }, { id: "list", label: "List", icon: "list", target: "list" }, { id: "quote", label: "Quote", icon: "quote", target: "quote" }];
  if (block.type === "paragraph" || block.type === "quote" || block.type === "list") {
    const transforms: BlockTransform[] = [...headingTransforms(), { id: "paragraph", label: "Paragraph", icon: "paragraph", target: "paragraph" }, { id: "list", label: "List", icon: "list", target: "list" }, { id: "quote", label: "Quote", icon: "quote", target: "quote" }];
    return transforms.filter((transform) => transform.target !== block.type);
  }
  if (block.type === "code" || block.type === "button") return [{ id: "paragraph", label: "Paragraph", icon: "paragraph", target: "paragraph" }];
  return [];
}

export function transformBlock(block: ContentBlock, transform: BlockTransform): ContentBlock {
  const text = textFromBlock(block);
  const align: TextAlignment | undefined = "align" in block ? block.align : undefined;
  if (transform.target === "heading") return { id: block.id, siteRole: block.siteRole, type: "heading", level: transform.level ?? 2, text, align };
  if (transform.target === "list") return { id: block.id, siteRole: block.siteRole, type: "list", style: "unordered", items: text.split(/\n+/).filter(Boolean).length ? text.split(/\n+/).filter(Boolean) : [""] };
  if (transform.target === "quote") return { id: block.id, siteRole: block.siteRole, type: "quote", text, align };
  return { id: block.id, siteRole: block.siteRole, type: "paragraph", text, align };
}
