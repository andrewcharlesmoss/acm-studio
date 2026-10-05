import type { ContentBlock } from "../content/model";
import { pasteBlockAppearance } from "./block-appearance";

type ButtonBlock = Extract<ContentBlock, { type: "button" }>;

/** A new action inherits appearance, never a neighbour's content or identity. */
export function createButtonForInsertion(id: string, source?: ButtonBlock): ButtonBlock {
  const button: ButtonBlock = { id, type: "button", label: "", url: "", style: "primary" };
  return source ? pasteBlockAppearance(button, source) as ButtonBlock : button;
}

/** Buttons selects its initial child; legacy standalone Button records remain intact. */
export function insertedBlockSelectionId(block: ContentBlock): string {
  return block.type === "buttons" ? block.children[0]?.id ?? block.id : block.id;
}
