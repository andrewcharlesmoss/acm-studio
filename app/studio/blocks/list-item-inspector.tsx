"use client";

import { useState } from "react";
import type { ListBlock, ListItem, ParagraphBackgroundGradient, ParagraphFontSize, ParagraphStyle } from "../../content/model";
import { InspectorAccordionSection } from "../inspector-accordion";
import { BackgroundSelection } from "../controls/background-selection";
import { ColourPicker } from "../controls/colour-picker";
import { FontSizeAppearanceSetting } from "../controls/font-size-appearance-setting";
import { LineHeightSetting } from "../controls/line-height-setting";
import { BoxLengthSetting } from "../box-length-setting";
import { findListBlock, updateListItem } from "../list-structure";
import { BlockLibraryIcon } from "../block-library-icons";
import { listItemSupportedStyleFields } from "./capability-profiles";

  const supportedStyleFields = new Set(listItemSupportedStyleFields);

export function ListItemInspector({ block, listId, itemIndex, onChange }: {
  block: ListBlock;
  listId: string;
  itemIndex: number;
  onChange: (block: ListBlock) => void;
}) {
  const list = findListBlock(block, listId);
  const item = list?.items[itemIndex];
  const style = item && typeof item !== "string" ? item.style ?? {} : {};
  const [backgroundMode, setBackgroundMode] = useState<"colour" | "gradient">(style.backgroundGradient ? "gradient" : "colour");
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

  function updateFontSize(value: ParagraphFontSize | string | undefined, mode: "presets" | "custom") {
    setFontSizeMode(mode);
    updateStyles({ fontSize: mode === "presets" ? value as ParagraphFontSize | undefined : undefined, fontSizeCustom: mode === "custom" ? value : undefined });
  }

  function updateBackground(backgroundColor: string | undefined, backgroundGradient: ParagraphBackgroundGradient | undefined) {
    updateStyles({ backgroundColor, backgroundGradient });
  }

  if (!item) return null;

  return <div className="block-inspector-settings list-item-inspector">
    <div className="inspector-sections"><section className="inspector-block-summary"><div className="inspector-block-summary-heading"><span><BlockLibraryIcon type="list" /></span><h2>List Item</h2></div><p className="setting-note">Style the selected item in this List.</p></section></div>
    <div className="inspector-sections">
      <InspectorAccordionSection title="Colour">
        <BackgroundSelection mode={backgroundMode} colour={style.backgroundColor} gradient={style.backgroundGradient} onModeChange={setBackgroundMode} onColourChange={value => updateBackground(value, undefined)} onGradientChange={value => updateBackground(undefined, value)} />
      </InspectorAccordionSection>
      <InspectorAccordionSection title="Typography">
        <FontSizeAppearanceSetting size={style.fontSize} customSize={style.fontSizeCustom} mode={fontSizeMode} onModeChange={setFontSizeMode} onSizeChange={value => updateFontSize(value, "presets")} onCustomSizeChange={value => updateFontSize(value, "custom")} onAppearanceChange={() => {}} showAppearance={false} />
        <LineHeightSetting value={style.lineHeight} onChange={value => updateStyle("lineHeight", value)} />
      </InspectorAccordionSection>
      <InspectorAccordionSection title="Dimensions">
        <BoxLengthSetting label="Padding" value={style.padding} layout="axes" min={0} max={100} onChange={value => updateStyle("padding", value)} />
        <BoxLengthSetting label="Margin" value={style.margin} layout="axes" min={-100} max={200} onChange={value => updateStyle("margin", value)} />
      </InspectorAccordionSection>
      <InspectorAccordionSection title="Elements">
        <ColourPicker label="Link colour" value={style.linkColor} onChange={value => updateStyle("linkColor", value)} clearLabel="Clear link colour" />
      </InspectorAccordionSection>
      <InspectorAccordionSection title="Advanced">
        <label><span>HTML anchor</span><input value={style.anchor ?? ""} onChange={event => { const value = event.target.value; if (!value || /^[a-z][a-z0-9_-]*$/i.test(value)) updateStyle("anchor", value || undefined); }} placeholder="section-name" /></label>
      </InspectorAccordionSection>
    </div>
  </div>;
}
