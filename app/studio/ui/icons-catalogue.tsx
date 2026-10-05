"use client";

import { useState } from "react";
import { iconNames, iconMetadata, iconScales, iconAddedAt, type IconName } from "@acm/icons";
import { AcmIcon } from "@acm/icons/react";
import { AcmStudioIcon } from "../acm-studio-icons";
import { blockLibraryEntries } from "../blocks/library-catalogue";
import { BlockLibraryIconSample, blockLibrarySymbol, type BlockIconType } from "../block-library-icons";
import { commandInventory } from "../ribbon/catalogue-model";
import { createIconPng, createIconSvg, downloadIconFile } from "./icon-download.mjs";
import { KeyboardCatalogue } from "./keyboard-catalogue";
import { formatIconAddedAt, sortIconsByAddedAt, type IconSortOrder } from "./icon-sort";

const blockLibraryCatalogue = blockLibraryEntries;
const studioIconConsumers: Partial<Record<IconName, Array<{ label: string; href: string }>>> = {
  "text.caption": [{ label: "Table caption visibility control", href: "/studio/ui/blocks/table" }],
  "view.styles": [{ label: "Table inspector Styles tab", href: "/studio/ui/blocks/table" }],
  "action.settings": [{ label: "Table inspector Settings tab", href: "/studio/ui/blocks/table" }],
  "action.adjust": [{ label: "Custom font size inspector control", href: "/studio/ui/blocks/paragraph" }, { label: "Box dimensions controls", href: "/studio/ui/controls#box-length" }],
  "action.add": [{ label: "Inspector options and block inserter controls", href: "/studio/ui/blocks/paragraph" }, { label: "Gradient stop controls", href: "/studio/ui/controls#background-selection" }],
  "action.close": [{ label: "Colour and gradient picker close controls", href: "/studio/ui/controls#background-selection" }, { label: "Inspector options menu close control", href: "/studio/ui/controls#inspector-tools" }, { label: "Remove a selected block", href: "/studio/ui/blocks/group" }, { label: "Collapse a Pane from its header", href: "/studio/ui/panes" }],
  "action.copy": [{ label: "Gradient stop colour copy control", href: "/studio/ui/controls#background-selection" }, { label: "Design canvas Copy, Paste and duplicate actions", href: "/studio/designs" }],
  "action.delete": [{ label: "Remove blocks, List View items and cover images", href: "/studio/ui/blocks/group" }],
  "action.duplicate": [{ label: "Duplicate block action", href: "/studio/ui/blocks/group" }],
  "action.edit": [{ label: "Edit inline text links", href: "/studio/ui/blocks/paragraph" }],
  "action.more": [{ label: "Block toolbar options menu", href: "/studio/ui/blocks/group" }, { label: "Inspector options menu", href: "/studio/ui/blocks/paragraph" }],
  "action.remove": [{ label: "Clear background colour control", href: "/studio/ui/controls#background-selection" }],
  "action.redo": [{ label: "Block specimen history controls", href: "/studio/ui/blocks/group" }],
  "action.reset": [{ label: "Block inspector reset controls", href: "/studio/ui/blocks/paragraph" }],
  "action.undo": [{ label: "Block specimen history controls", href: "/studio/ui/blocks/group" }, { label: "Reset Pane demo", href: "/studio/ui/panes" }],
  "action.link": [{ label: "Linked padding and margin controls", href: "/studio/ui/blocks/group" }, { label: "Add a link to selected text", href: "/studio/ui/blocks/paragraph" }],
  "action.unlink": [{ label: "Unlinked padding and margin controls", href: "/studio/ui/blocks/group" }],
  "arrange.reorder": [{ label: "Block reorder handles", href: "/studio/ui/blocks/group" }],
  "arrange.indent": [{ label: "Indent selected List Item", href: "/studio/ui/blocks/list" }],
  "arrange.move-down": [{ label: "Move blocks down in the editor canvas", href: "/studio/ui/blocks/group" }, { label: "Move selected blocks down in List View", href: "/studio/ui/blocks/group" }],
  "arrange.move-up": [{ label: "Move blocks up in the editor canvas", href: "/studio/ui/blocks/group" }, { label: "Move selected blocks up in List View", href: "/studio/ui/blocks/group" }],
  "arrange.outdent": [{ label: "Outdent selected List Item", href: "/studio/ui/blocks/list" }],
  "navigation.back": [{ label: "Studio navigation and publish-date previous-month control", href: "/studio" }],
  "navigation.chevron-right": [{ label: "Pane collapse controls", href: "/studio/ui/panes" }],
  "navigation.disclosure": [{ label: "Inspector sections and control menus", href: "/studio/ui/blocks/group" }],
  "navigation.external": [{ label: "Advanced settings and help links", href: "/studio/ui/blocks/list-item" }, { label: "Paragraph Advanced help link", href: "/studio/ui/blocks/paragraph" }],
  "navigation.forward": [{ label: "Studio navigation and publish-date next-month control", href: "/studio" }],
  "text.align-left": [{ label: "Text alignment in block toolbars", href: "/studio/ui/blocks/quote" }],
  "text.align-centre": [{ label: "Text alignment in block toolbars", href: "/studio/ui/blocks/quote" }],
  "text.align-right": [{ label: "Text alignment in block toolbars", href: "/studio/ui/blocks/quote" }],
  "text.bold": [{ label: "Bold inline text formatting", href: "/studio/ui/blocks/paragraph" }],
  "text.footnote": [{ label: "Insert an inline footnote", href: "/studio/ui/blocks/paragraph" }],
  "text.italic": [{ label: "Italic inline text formatting", href: "/studio/ui/blocks/paragraph" }],
  "text.language": [{ label: "Set inline text language", href: "/studio/ui/blocks/paragraph" }, { label: "Show the destination of a selected external link", href: "/studio/ui/blocks/paragraph" }],
  "text.math": [{ label: "Insert inline mathematical notation", href: "/studio/ui/blocks/paragraph" }],
  "state.selected": [{ label: "Selected inspector options", href: "/studio/ui/blocks/group" }, { label: "Selected custom font size unit", href: "/studio/ui/blocks/paragraph" }],
  "state.warning": [{ label: "Background contrast warning", href: "/studio/ui/controls#background-selection" }],
  "view.hide": [{ label: "Hide a page on the design canvas", href: "/studio/designs" }, { label: "Mask a Site Settings value", href: "/studio/sites/mini-golf-scorecard" }],
  "view.show": [{ label: "Show a hidden page on the design canvas", href: "/studio/designs" }, { label: "Reveal a masked Site Settings value", href: "/studio/sites/mini-golf-scorecard" }],
  "view.zoom-in": [{ label: "Zoom in on the Design Canvas", href: "/studio/designs" }, { label: "Zoom in on a template canvas", href: "/studio/templates" }],
  "view.zoom-out": [{ label: "Zoom out on the Design Canvas", href: "/studio/designs" }, { label: "Zoom out on a template canvas", href: "/studio/templates" }],
  "table.row-before": [{ label: "Insert table row before", href: "/studio/ui/blocks/table" }],
  "table.row-after": [{ label: "Insert table row after", href: "/studio/ui/blocks/table" }],
  "table.cell": [{ label: "Table options menu", href: "/studio/ui/blocks/table" }],
  "table.row-delete": [{ label: "Delete table row", href: "/studio/ui/blocks/table" }],
  "table.column-before": [{ label: "Insert table column before", href: "/studio/ui/blocks/table" }],
  "table.column-after": [{ label: "Insert table column after", href: "/studio/ui/blocks/table" }],
  "table.column-delete": [{ label: "Delete table column", href: "/studio/ui/blocks/table" }],
  "insert.embed": [{ label: "Embed block tile and URL entry specimen", href: "/studio/ui/blocks/embed" }],
  "insert.highlight": [{ label: "Highlight inline text", href: "/studio/ui/blocks/paragraph" }],
  "insert.image": [{ label: "Insert an inline image in text", href: "/studio/ui/blocks/paragraph" }],
  "text.code": [{ label: "Format inline code", href: "/studio/ui/blocks/paragraph" }],
  "text.keyboard": [{ label: "Format keyboard input", href: "/studio/ui/blocks/paragraph" }],
  "text.strikethrough": [{ label: "Format strikethrough text", href: "/studio/ui/blocks/paragraph" }],
  "text.subscript": [{ label: "Format subscript text", href: "/studio/ui/blocks/paragraph" }],
  "text.superscript": [{ label: "Format superscript text", href: "/studio/ui/blocks/paragraph" }],
  "text.heading-one": [{ label: "Heading 1 pane and toolbar controls", href: "/studio/ui/blocks/heading" }, { label: "Heading level control specimen", href: "/studio/ui/controls/heading-level" }],
  "text.heading-two": [{ label: "Heading 2 pane and toolbar controls", href: "/studio/ui/blocks/heading" }, { label: "Heading level control specimen", href: "/studio/ui/controls/heading-level" }],
  "text.heading-three": [{ label: "Heading 3 pane and toolbar controls", href: "/studio/ui/blocks/heading" }, { label: "Heading level control specimen", href: "/studio/ui/controls/heading-level" }],
  "text.heading-four": [{ label: "Heading 4 pane and toolbar controls", href: "/studio/ui/blocks/heading" }, { label: "Heading level control specimen", href: "/studio/ui/controls/heading-level" }],
  "text.heading-five": [{ label: "Heading 5 pane and toolbar controls", href: "/studio/ui/blocks/heading" }, { label: "Heading level control specimen", href: "/studio/ui/controls/heading-level" }],
  "text.heading-six": [{ label: "Heading 6 pane and toolbar controls", href: "/studio/ui/blocks/heading" }, { label: "Heading level control specimen", href: "/studio/ui/controls/heading-level" }],
  "block.heading": [{ label: "Transform a block to Heading", href: "/studio/ui/blocks/heading" }],
  "block.list": [{ label: "Transform a block to List", href: "/studio/ui/blocks/list" }],
  "text.paragraph": [{ label: "Transform a block to Paragraph", href: "/studio/ui/blocks/paragraph" }],
  "text.quote": [{ label: "Transform a block to Quote", href: "/studio/ui/blocks/quote" }],
  "layout.columns": [{ label: "Group Columns layout compatibility option", href: "/studio/ui/blocks/group" }],
  "layout.flow": [{ label: "Group layout selector in the inspector", href: "/studio/ui/blocks/group" }, { label: "Empty Group layout selector on the canvas", href: "/studio/ui/blocks/group" }],
  "layout.row": [{ label: "Group layout selector in the inspector", href: "/studio/ui/blocks/group" }, { label: "Empty Group layout selector on the canvas", href: "/studio/ui/blocks/group" }],
  "layout.stack": [{ label: "Group layout selector in the inspector", href: "/studio/ui/blocks/group" }, { label: "Empty Group layout selector on the canvas", href: "/studio/ui/blocks/group" }],
  "layout.grid": [{ label: "Group layout selector in the inspector", href: "/studio/ui/blocks/group" }, { label: "Empty Group layout selector on the canvas", href: "/studio/ui/blocks/group" }],
};

export function IconsCatalogue({ initialIcon, initialBlock, collection = "icons" }: { initialIcon?: string; initialBlock?: string; collection?: "icons" | "keyboard" | "blocks" }) {
  const [iconQuery, setIconQuery] = useState("");
  const [golden, setGolden] = useState(false);
  const [dark, setDark] = useState(false);
  const [iconSortOrder, setIconSortOrder] = useState<IconSortOrder>("catalogue");
  const [icon, setIcon] = useState<IconName>(() => iconNames.includes(initialIcon as IconName) ? initialIcon as IconName : "action.undo");
  const [exportStatus, setExportStatus] = useState("");
  const [blockQuery, setBlockQuery] = useState("");
  const [blockSymbol, setBlockSymbol] = useState<BlockIconType>(() => blockLibraryCatalogue.some(item => item.type === initialBlock) ? initialBlock as BlockIconType : "paragraph");
  const filteredIcons = sortIconsByAddedAt(iconNames.filter((name) => !name.startsWith("keyboard.") && (!golden || iconMetadata[name].golden) && (name + " " + iconMetadata[name].label + " " + iconMetadata[name].keywords.join(" ")).toLowerCase().includes(iconQuery.toLowerCase())), iconAddedAt, iconSortOrder);
  const filteredBlocks = blockLibraryCatalogue.filter((item) => `${item.label} ${item.description} ${item.group} ${blockLibrarySymbol(item.type).symbol}`.toLowerCase().includes(blockQuery.toLowerCase()));
  const selectedBlock = blockLibraryCatalogue.find((item) => item.type === blockSymbol) ?? blockLibraryCatalogue[0];
  const selectedBlockSymbol = blockLibrarySymbol(selectedBlock.type);
  const ribbonExamples = commandInventory.filter((control) => control.icon === icon || control.iconVariants?.includes(icon));
  const blockConsumers = blockLibraryCatalogue.filter(item => {
    const symbol = blockLibrarySymbol(item.type);
    return symbol.source === "ACM Icons" && symbol.symbol === icon;
  }).map(item => ({ label: `Block Library symbol — ${item.label}`, href: `/studio/ui/icons?collection=blocks&block=${encodeURIComponent(item.type)}` }));
  const studioConsumers = [...new Map([...(studioIconConsumers[icon] ?? []), ...blockConsumers].map(consumer => [`${consumer.href}:${consumer.label}`, consumer])).values()];

  async function downloadIcon(scale: typeof iconScales[number], size: number, format: "svg" | "png") {
    try {
      const svg = createIconSvg(icon, scale, size);
      const blob = format === "svg"
        ? new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
        : await createIconPng(svg, size);
      const filename = `${icon}-${size}px${format === "png" ? "-3x" : ""}.${format}`;
      downloadIconFile(blob, filename);
      setExportStatus(`${iconMetadata[icon].label} ${size}px ${format.toUpperCase()} download started.`);
    } catch {
      setExportStatus(`Could not prepare the ${format.toUpperCase()} download. Try again.`);
    }
  }

  return <section className="ui-icons-page" aria-labelledby="ui-icons-title">
      <div className="ui-page-intro">
        <p className="rl-eyebrow">Shared ACM Foundation</p>
        <h1 id="ui-icons-title">Symbols for websites, videos and more.</h1>
        <p>Browse ACM artwork and sourced brand marks, and download SVG or PNG assets.</p>
      </div>
      <nav className="ui-symbol-collections" aria-label="Symbol Collections">
        <a href="/studio/ui/icons" aria-current={collection === "icons" ? "page" : undefined}><AcmIcon name="insert.shapes" size={20} />Interface Icons</a>
        <a href="/studio/ui/icons?collection=blocks" aria-current={collection === "blocks" ? "page" : undefined}><AcmIcon name="document.insert" size={20} />Block Library</a>
        <a href="/studio/ui/icons?collection=keyboard" aria-current={collection === "keyboard" ? "page" : undefined}><AcmIcon name="text.keyboard" size={20} />Keyboard <span>UK Set</span></a>
      </nav>
      {collection === "keyboard" ? <KeyboardCatalogue /> : collection === "blocks" ? <div className="rl-layout">
        <aside className="rl-sidebar" aria-label="Block Symbol Filters">
          <h2>Block Symbols</h2>
          <label className="rl-search"><AcmIcon name="action.search" size={18} /><input aria-label="Search Block Symbols" placeholder="Search blocks…" value={blockQuery} onChange={(event) => setBlockQuery(event.target.value)} /></label>
          <label className="rl-check"><input type="checkbox" checked={dark} onChange={(event) => setDark(event.target.checked)} />Dark Specimens</label>
          <p>{filteredBlocks.length} {filteredBlocks.length === 1 ? "block" : "blocks"} · three scales</p>
          <p className="rl-secondary">Regular-S · 16px<br />Regular-M · 24px<br />Regular-L · 32px</p>
        </aside>
        <section className="rl-main" aria-label="Block Library Icon Catalogue">
          <div className="rl-section-heading"><p className="rl-eyebrow">ACM STUDIO BLOCK LIBRARY</p><h2>Symbols used for each block type.</h2></div>
          <div className={"rl-icon-grid" + (dark ? " rl-dark" : "")}>{filteredBlocks.map((item) => {
            const symbol = blockLibrarySymbol(item.type);
            return <button className="rl-icon-card" type="button" key={item.type} aria-pressed={blockSymbol === item.type} onClick={() => setBlockSymbol(item.type)}>
              <span className="rl-icon-scales">{iconScales.map((scale, index) => {
                const size = [16, 24, 32][index];
                return <span key={scale} title={scale}><BlockLibraryIconSample type={item.type} scale={scale} size={size} /></span>;
              })}</span>
              <strong>{item.label}</strong><small>{symbol.source} · {symbol.symbol}</small>
            </button>;
          })}</div>
          {!filteredBlocks.length && <p>No blocks match this search.</p>}
        </section>
        <aside className="rl-inspector" aria-label="Block Symbol Inspector">
          <p className="rl-eyebrow">BLOCK SYMBOL</p><h2>{selectedBlock.label}</h2>
          <a className="ui-block-symbol-link" href={`/studio/ui/icons?icon=${encodeURIComponent(selectedBlockSymbol.symbol)}`}><code>{selectedBlockSymbol.symbol}</code><span>Open shared symbol</span></a>
          <div className="rl-enlarged"><BlockLibraryIconSample type={selectedBlock.type} scale="Regular-L" size={144} /></div>
          <p>{selectedBlock.description}</p>
          <details open><summary>Artwork source</summary><p>This block uses original product-neutral ACM artwork from the shared icon catalogue.</p></details>
        </aside>
      </div> : <div className="rl-layout">
        <aside className="rl-sidebar" aria-label="Icon Filters">
          <h2>Symbols</h2>
          <label className="rl-search"><AcmIcon name="action.search" size={18} /><input aria-label="Search Icons" placeholder="Search icons…" value={iconQuery} onChange={(event) => setIconQuery(event.target.value)} /></label>
          <label className="rl-check"><input type="checkbox" checked={golden} onChange={(event) => setGolden(event.target.checked)} />Golden Reference Only</label>
          <label className="rl-check"><input type="checkbox" checked={dark} onChange={(event) => setDark(event.target.checked)} />Dark Specimens</label>
          <label className="rl-picker ui-icon-sort">Sort By<select value={iconSortOrder} onChange={(event) => setIconSortOrder(event.target.value as IconSortOrder)}><option value="catalogue">Catalogue Order</option><option value="newest">Newest Added</option><option value="oldest">Oldest Added</option></select></label>
          <p>{filteredIcons.length} {filteredIcons.length === 1 ? "symbol" : "symbols"} · three scales</p>
          <p className="rl-secondary">Regular-S · 16px<br />Regular-M · 24px<br />Regular-L · 32px</p>
        </aside>
        <section className="rl-main" aria-label="ACM Icon Catalogue">
          <div className="rl-section-heading"><p className="rl-eyebrow">ACM ICONS</p><h2>One family. Every action.</h2></div>
          <div className={"rl-icon-grid" + (dark ? " rl-dark" : "")}>{filteredIcons.map((name) => <button className="rl-icon-card" type="button" key={name} aria-pressed={icon === name} onClick={() => setIcon(name)}>
            <span className="rl-icon-scales">{iconScales.map((scale, index) => <span key={scale} title={scale}><AcmIcon name={name} scale={scale} size={[16, 24, 32][index]} /></span>)}</span>
            <strong>{iconMetadata[name].label}</strong><small>{name}</small>
          </button>)}</div>
          {!filteredIcons.length && <p>No icons match this search.</p>}
        </section>
        <aside className="rl-inspector" aria-label="Icon Inspector">
          <p className="rl-eyebrow">SYMBOL INSPECTOR</p><h2>{iconMetadata[icon].label}</h2><code>{icon}</code>
          <div className="rl-enlarged"><AcmIcon name={icon} size={144} /></div><p>{iconMetadata[icon].description}</p>
          <p className="ui-icon-added-at"><span>Added</span> <time dateTime={iconAddedAt[icon]}>{formatIconAddedAt(iconAddedAt[icon])}</time></p>
          <div className="rl-scale-samples">{iconScales.map((scale, index) => {
            const size = [16, 24, 32][index];
            return <div key={scale}>
              <AcmIcon name={icon} scale={scale} size={size} />
              <span className="ui-icon-scale-label">{scale}<small>{size}px</small></span>
              <span className="ui-icon-download-actions">
                <button type="button" className="ui-icon-download" aria-label={`Download ${size}px SVG`} title={`Download ${size}px SVG`} onClick={() => void downloadIcon(scale, size, "svg")}><AcmStudioIcon name="download" size={14} /><span>SVG</span></button>
                <button type="button" className="ui-icon-download" aria-label={`Download ${size}px PNG at 3×`} title={`Download transparent PNG at ${size * 3}×${size * 3}px`} onClick={() => void downloadIcon(scale, size, "png")}><AcmStudioIcon name="download" size={14} /><span>PNG</span></button>
              </span>
            </div>;
          })}</div>
          <p className="ui-icon-download-note">PNG files have a transparent background and export at 3× the selected size.</p>
          <p className="ui-icon-download-status" role="status" aria-live="polite">{exportStatus}</p>
          <h3>ACM Studio consumers</h3>
          <ul className="rl-usage">{studioConsumers.map((consumer, index) => <li key={`${consumer.href}-${consumer.label}-${index}`}><small>{consumer.href.startsWith("/studio/ui/") ? "Studio UI Library" : "ACM Studio"}</small><a href={consumer.href}>{consumer.label}</a></li>)}</ul>
          {!studioConsumers.length && <p>No additional Studio pane or canvas examples are linked to this symbol.</p>}
          <h3>Ribbon catalogue examples</h3>
          <ul className="rl-usage">{ribbonExamples.map((control) => <li key={control.id}><small>{control.product === "skeleton" ? "Component Specimen" : control.product === "studio" ? "ACM Studio" : "ACM Account"}</small>{control.label}{icon !== control.icon ? " (state variant)" : ""}</li>)}</ul>
          {!ribbonExamples.length && <p>No Ribbon catalogue examples use this symbol.</p>}
          <details><summary>Provenance and source</summary><p>{iconMetadata[icon].provenance}</p><code>acm-icons/masters/{icon}.svg</code><p>Three editable optical scales from the shared ACM icon catalogue.</p></details>
        </aside>
      </div>}
    </section>;
}
