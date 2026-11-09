"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { ContentBlock, ParagraphStyle } from "../../content/model";
import { StyleVariationSetting } from "../controls/style-variation-setting";
import { groupStyleVariation, setGroupStyleVariation } from "./group-variations";

type Preview = { blockId: string; variation: string } | null;
const GroupStylePreviewContext = createContext<{ preview: Preview; setPreview: (preview: Preview) => void }>({ preview: null, setPreview() {} });

/** Hover/focus presentation is session state, outside content, saving and Undo. */
export function GroupStylePreviewProvider({ selectionKey, children }: { selectionKey: string; children: ReactNode }) {
  const [state, setState] = useState<{ selectionKey: string; preview: Preview }>({ selectionKey, preview: null });
  // Discard transient presentation when selection/history changes; returning to
  // the same block must not revive a preview from its previous inspector.
  if (state.selectionKey !== selectionKey) setState({ selectionKey, preview: null });
  return <GroupStylePreviewContext.Provider value={{ preview: state.selectionKey === selectionKey ? state.preview : null, setPreview: preview => setState({ selectionKey, preview }) }}>{children}</GroupStylePreviewContext.Provider>;
}

export function useGroupStylePreview() { return useContext(GroupStylePreviewContext).preview; }

export function groupPreviewStyle(blockId: string, style: ParagraphStyle | undefined, preview: Preview) {
  return preview?.blockId === blockId ? setGroupStyleVariation(style, preview.variation) : style;
}

export function GroupStyleVariationSetting({ block, onChange }: { block: Extract<ContentBlock, { type: "group" }>; onChange: (block: ContentBlock) => void }) {
  const { setPreview } = useContext(GroupStylePreviewContext);
  return <StyleVariationSetting kind="group" value={groupStyleVariation(block.visualStyle)} onPreview={variation => setPreview(variation === null ? null : { blockId: block.id, variation })} onChange={variation => { setPreview(null); onChange({ ...block, visualStyle: setGroupStyleVariation(block.visualStyle, variation) }); }} />;
}
