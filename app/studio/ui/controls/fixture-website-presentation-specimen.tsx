"use client";
import { useState } from "react";
import { BlockRenderer } from "../../../components/content";
import type { ContentBlock } from "../../../content/model";
import { BlockField } from "../../studio-canvas";
import { SelectControl } from "../../controls/native-fields";
import { StudioButton } from "../../controls/button";
import { comparisonHomeBlocks } from "../../site-editor/comparison-home-model";
import { effectiveWebsiteDesign } from "../../site-editor/website-design";
import { WebsiteDesignSurface } from "../../site-editor/website-design-surface";
import "../../site-editor/style-reference-fonts.css";

const initialBlocks = (): ContentBlock[] => [{ id: "fixture-home", type: "heading", level: 1, text: "Home" }, ...structuredClone(comparisonHomeBlocks)];
/** The actual fixture renderer with isolated content and empty saved design settings. */
export function FixtureWebsitePresentationSpecimen() {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const [width, setWidth] = useState("900");
  const [overrides, setOverrides] = useState(false);
  const [buttonTypography, setButtonTypography] = useState("default");
  const [padding, setPadding] = useState("default");
  const [textStyle, setTextStyle] = useState("default");
  const design = effectiveWebsiteDesign({ identity: {}, styles: {
    ...(overrides || buttonTypography !== "default" || textStyle !== "default" ? { typography: { elements: {
      ...(overrides || textStyle !== "default" ? { text: { ...(overrides ? { size: "20px" } : {}), ...(textStyle === "italic" ? { fontStyle: "italic" as const } : {}) } } : {}),
      ...(buttonTypography === "custom" ? { buttons: { size: "24px" } } : buttonTypography === "preset" ? { buttons: { preset: "large" } } : {}),
    } } } : {}),
    ...(padding !== "default" ? { layout: { padding } } : {}),
  } }, { identity: {}, styles: {} });
  const content: ContentBlock[] = overrides ? blocks.map(block => {
    if (block.type === "heading") return { ...block, visualStyle: block.level === 2
      ? { responsive: { mobile: { fontSizeCustom: "29px" } } }
      : { ...block.visualStyle, textColor: "#135724", fontSizeCustom: "37px", responsive: { mobile: { fontSizeCustom: "29px" } } } };
    if (block.type === "image") return { ...block, displayWidth: 320 };
    if (block.type === "quote") return { ...block, visualStyle: { appearance: "regular" } };
    if (block.type === "code") return { ...block, visualStyle: { borderRadius: "12px" } };
    if (block.type === "buttons") return { ...block, children: block.children.map(button => ({ ...button,
      visualStyle: { borderRadius: "12px", textColor: "#246813", fontSizeCustom: "26px" },
      interactionStyles: { hover: { textColor: "#abcdef", borderRadius: "18px" } },
    })) };
    return block;
  }) : blocks;
  return <details><summary>Compare website presentation</summary>
    <div role="group" aria-label="Fixture website presentation controls">
      <label>Website example mode<SelectControl value={mode} onChange={event => setMode(event.target.value as typeof mode)}><option value="edit">Edit</option><option value="preview">Preview</option></SelectControl></label>
      <label>Website example width<SelectControl value={width} onChange={event => setWidth(event.target.value)}><option value="900">Desktop</option><option value="768">Tablet</option><option value="390">Mobile</option></SelectControl></label>
      <label>Button typography example<SelectControl value={buttonTypography} onChange={event => setButtonTypography(event.target.value)}><option value="default">Default</option><option value="custom">Custom 24px</option><option value="preset">Large preset</option></SelectControl></label>
      <label>Website gutter example<SelectControl value={padding} onChange={event => setPadding(event.target.value)}><option value="default">Default</option><option value="10px">10px</option><option value="40px">40px</option></SelectControl></label>
      <label>Text style example<SelectControl value={textStyle} onChange={event => setTextStyle(event.target.value)}><option value="default">Default</option><option value="italic">Italic</option></SelectControl></label>
      <label><input type="checkbox" checked={overrides} onChange={event => setOverrides(event.target.checked)} />Authored overrides</label>
      <StudioButton onClick={() => { setBlocks(initialBlocks()); setMode("preview"); setWidth("900"); setOverrides(false); setButtonTypography("default"); setPadding("default"); setTextStyle("default"); }}>Reset website example</StudioButton>
    </div>
    <div style={{ maxWidth: "100%", overflowX: "auto" }}><div style={{ width: `${width}px` }}>
      <WebsiteDesignSurface design={design} legacy={design.legacy} referenceDefaults scopeId="library-fixture-website">
        <main className="test-site-page" aria-label="Fixture website presentation">
          {mode === "preview" ? <BlockRenderer variant="studio" blocks={content} /> : <div className="studio-block-preview">{content.map((block, index) => <BlockField key={block.id} block={block} rootBlocks={content} previousSibling={content[index - 1]} writable={!overrides} onChange={next => setBlocks(current => current.map(item => item.id === next.id ? next : item))} onTextSelection={() => {}} onLinkActivate={() => {}} onTableCellFocus={() => {}} />)}</div>}
        </main>
      </WebsiteDesignSurface>
    </div></div>
  </details>;
}
