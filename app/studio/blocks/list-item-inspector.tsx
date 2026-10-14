"use client";

import { useResponsiveStyleScope } from "../responsive-style-context";
import { useState } from "react";
import type { ListBlock, ListItem, ParagraphStyle } from "../../content/model";
import { InspectorAccordionSection } from "../inspector-accordion";
import { ParagraphInspector, ManagedBackgroundImageInspector } from "./inspectors/paragraph-inspector";
import { AdvancedFieldsControl } from "../controls/advanced-fields-control";
import { findListBlock, updateListItem } from "../list-structure";
import { BlockLibraryIcon } from "../block-library-icons";
import { listItemStyleInspectorProfile, listItemSupportedStyleFields } from "./capability-profiles";

import type { ListItemBackgroundTarget } from "../list-item-background";

const supportedStyleFields = new Set(listItemSupportedStyleFields);

export function ListItemInspector({ block, listId, itemIndex, onChange, onOpenBackgroundMedia }: {
  block: ListBlock;
  listId: string;
  itemIndex: number;
  onChange: (block: ListBlock) => void;
  onOpenBackgroundMedia?: (target: ListItemBackgroundTarget) => void;
}) {
  const { editingViewport } = useResponsiveStyleScope();
  const list = findListBlock(block, listId);
  const item = list?.items[itemIndex] ?? (list && !list.items.length && itemIndex === 0 ? "" : undefined);
  const style = item && typeof item !== "string" ? item.style ?? {} : {};
  const [fontSizeMode, setFontSizeMode] = useState<"presets" | "custom">(style.fontSizeCustom ? "custom" : "presets");
  function updateStyles(changes: Partial<ParagraphStyle>) {
    onChange(updateListItem(block, listId, itemIndex, current => {
      const currentItem: Exclude<ListItem, string> = typeof current === "string" ? { text: current } : current;
      const nextStyle = { ...(currentItem.style ?? {}) };
      for (const [key, value] of Object.entries(changes) as Array<[keyof ParagraphStyle, ParagraphStyle[keyof ParagraphStyle] | undefined]>) {
        if (!supportedStyleFields.has(key)) continue;
        if (value === undefined || value === "") delete nextStyle[key];
        else nextStyle[key] = value as never;
      }
      return { ...currentItem, style: Object.keys(nextStyle).length ? nextStyle : undefined };
    }));
  }

  function updateStyle<K extends keyof ParagraphStyle>(field: K, value: ParagraphStyle[K] | undefined) {
    updateStyles({ [field]: value } as Partial<ParagraphStyle>);
  }

  if (item === undefined) return null;

  return <div className="block-inspector-settings list-item-inspector">
    <div className="inspector-sections"><section className="inspector-block-summary"><div className="inspector-block-summary-heading"><span><BlockLibraryIcon type="list" /></span><h2>List Item</h2></div><p className="setting-note">Style the selected item in this List.</p></section></div>
    <div className="inspector-sections">
      <ParagraphInspector backgroundImageControls={<ManagedBackgroundImageInspector block={{ id: listId, type: "list", style: "unordered", items: [], visualStyle: style }} onChange={() => {}} onOpenBackgroundMedia={onOpenBackgroundMedia ? () => onOpenBackgroundMedia({ listId, itemIndex, baseline: JSON.stringify(list!.items) }) : undefined} embedded />} backgroundImageOptions={<ManagedBackgroundImageInspector block={{ id: listId, type: "list", style: "unordered", items: [], visualStyle: style }} onChange={next => { if (next.type === "list") {
        const changes: Partial<ParagraphStyle> = {};
        for (const field of ["backgroundImageMediaId", "backgroundSize", "backgroundRepeat", "backgroundFixedSize", "backgroundPositionX", "backgroundPositionY"] as const) changes[field] = next.visualStyle?.[field] as never;
        updateStyles(changes);
      } }} detailsOnly />} profileOverride={listItemStyleInspectorProfile} block={{ id: `${listId}-item-${itemIndex}`, type: "paragraph", text: typeof item === "string" ? item : item.text, style }} fontSizeViewMode={fontSizeMode} onFontSizeViewModeChange={setFontSizeMode} onChange={next => {
        if (next.type !== "paragraph") return;
        const changes: Partial<ParagraphStyle> = {};
        for (const field of listItemSupportedStyleFields) changes[field as keyof ParagraphStyle] = next.style?.[field as keyof ParagraphStyle] as never;
        updateStyles(changes);
      }} />
      {editingViewport === "desktop" ? <InspectorAccordionSection title="Advanced" className="advanced-fields-section">
        <AdvancedFieldsControl fields={{ anchor: true, className: true, additionalCss: true }} style={style} blockName="List Item" placeholders onChange={(field, value) => {
          if (field === "anchor" && value && !/^[a-z][a-z0-9_-]*$/i.test(value)) return;
          if (field === "className" && value && !/^[a-z0-9 _-]*$/i.test(value)) return;
          updateStyle(field, value || undefined);
        }} />
      </InspectorAccordionSection> : null}
    </div>
  </div>;
}
