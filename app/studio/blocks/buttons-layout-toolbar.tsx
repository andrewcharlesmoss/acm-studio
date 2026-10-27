"use client";

import type { ContentBlock } from "../../content/model";
import { changeButtonsJustification, buttonsVerticalAlignment, type ButtonsBlock } from "../../content/buttons-alignment";
import { GroupLayoutToolbar } from "./group-layout-toolbar";

function projection(block: ButtonsBlock): Extract<ContentBlock, { type: "group" }> {
  return {
    id: block.id, type: "group", children: [],
    layout: block.orientation === "vertical" ? "stack" : "row",
    horizontalAlign: block.justification ?? "left",
    verticalAlign: buttonsVerticalAlignment(block),
  };
}

type Props = {
  block: ButtonsBlock;
  writable: boolean;
  onUpdate: (update: (current: ButtonsBlock) => ButtonsBlock) => void;
};

/** Parent commands stay with the editor; alignment presentation is canonical. */
export function ButtonsLayoutToolbar({ block, writable, onUpdate }: Props) {
  return <GroupLayoutToolbar block={projection(block)} writable={writable} onUpdate={update => onUpdate(current => {
    if (current.orientation !== block.orientation) return current;
    const before = projection(current);
    const next = update(before);
    if (next === before) return current;
    const justification = next.horizontalAlign as ButtonsBlock["justification"];
    const verticalAlign = next.verticalAlign;
    if (justification === before.horizontalAlign && verticalAlign === before.verticalAlign) return current;
    return {
      ...changeButtonsJustification(current, justification),
      ...(verticalAlign !== before.verticalAlign ? { verticalAlign } : {}),
    };
  })} />;
}
