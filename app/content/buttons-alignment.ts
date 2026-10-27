import type { ContentBlock, GroupLayoutVerticalAlignment } from "./model";

export type ButtonsBlock = Extract<ContentBlock, { type: "buttons" }>;
type ButtonsAlignment = Pick<ButtonsBlock, "orientation" | "justification" | "verticalAlign">;

/** Older vertical groups used justification on both physical axes. */
export function buttonsVerticalAlignment(block: ButtonsAlignment): GroupLayoutVerticalAlignment {
  if (block.verticalAlign !== undefined) return block.verticalAlign;
  if (block.orientation !== "vertical") return "centre";
  return block.justification === "centre" ? "centre"
    : block.justification === "right" ? "bottom"
    : block.justification === "space-between" ? "space-between" : "top";
}

/** First authoring one physical axis must retain the other legacy inferred axis. */
export function changeButtonsJustification(block: ButtonsBlock, justification: ButtonsBlock["justification"]): ButtonsBlock {
  if ((block.justification ?? "left") === (justification ?? "left")) return block;
  return {
    ...block,
    justification,
    ...(block.orientation === "vertical" && block.verticalAlign === undefined
      ? { verticalAlign: buttonsVerticalAlignment(block) } : {}),
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

/** Include discriminated retained template patches, independently of website styles. */
export function containsButtonsAlignment(value: unknown): boolean {
  if (Array.isArray(value)) {
    const patches = value.filter((entry): entry is Record<string, unknown> => record(entry) && Array.isArray(entry.path));
    for (const patch of patches) {
      const path = patch.path as unknown[];
      if (!["templates", "parts"].includes(path[0] as string) || !path.includes("nodes") || path.at(-1) !== "type" || patch.value !== "buttons") continue;
      const prefix = path.slice(0, -1);
      if (patches.some(candidate => {
        const other = candidate.path as unknown[];
        if (!prefix.every((part, index) => other[index] === part) || candidate.value === undefined) return false;
        if (other.length === prefix.length && record(candidate.value)) return candidate.value.verticalAlign !== undefined || candidate.value.justification === "stretch";
        return other.length === prefix.length + 1 && (other.at(-1) === "verticalAlign" || other.at(-1) === "justification" && candidate.value === "stretch");
      })) return true;
    }
    return value.some(containsButtonsAlignment);
  }
  if (!record(value)) return false;
  if (value.type === "buttons" && (value.verticalAlign !== undefined || value.justification === "stretch")) return true;
  return Object.values(value).some(containsButtonsAlignment);
}
