"use client";

import { useEffect, useState } from "react";
import { BoxLengthSetting } from "../../../studio/box-length-setting";
import { InspectorAccordionSection } from "../../../studio/inspector-accordion";
import { InspectorToolsSection } from "../../../studio/inspector-tools-section";
import { CustomFontSizeSetting } from "../../../studio/controls/custom-font-size-setting";
import { ColourPicker, ColourValueSwatch } from "../../../studio/controls/colour-picker";
import { ParagraphLengthSetting } from "../../../studio/controls/paragraph-length-setting";
import { StudioUiLibrary } from "../studio-ui-library";
import { StudioIcon } from "../../../studio/studio-icons";

const entries = [
  { id: "colour-picker", title: "Colour picker", purpose: "Choose a preset or custom colour, including independent Default and Hover values.", owner: "ACM Studio controls", consumers: "Paragraph text, links and backgrounds; Divider colour.", blockHref: "/studio/ui/blocks/paragraph", states: "Unset and explicit colours, selected swatches, focus, contrast warning, Default/Hover, clear and reset." },
  { id: "custom-font-size", title: "Custom font size", purpose: "Edit supported custom font-size units with a compact range control.", owner: "ACM Studio controls", consumers: "Paragraph and shared Typography inspectors.", blockHref: "/studio/ui/blocks/paragraph", states: "px, em, rem, vw and vh; numeric entry, unit menu, range adjustment and pointer drag." },
  { id: "paragraph-length", title: "Paragraph length", purpose: "Set a scalar length for Paragraph-specific spacing and indentation.", owner: "ACM Studio controls", consumers: "Paragraph line indent and selected legacy shared inspector paths.", blockHref: "/studio/ui/blocks/paragraph", states: "Empty/default, positive and negative values, supported units, range and reset." },
  { id: "box-length", title: "Box dimensions", purpose: "Edit linked or separate sides, axes and corners.", owner: "Existing shared Studio control", consumers: "Padding, margin, border width and radius settings across block inspectors.", blockHref: "/studio/ui/blocks/paragraph", states: "Linked and split values, units, custom number entry and reset." },
  { id: "inspector-tools", title: "Inspector options and reset", purpose: "Show or hide optional controls in Gutenberg and Studio groups and reset a section.", owner: "Existing shared Studio inspector", consumers: "Paragraph and the shared style inspector used by 18 block types.", blockHref: "/studio/ui/blocks/paragraph", states: "Optional controls, source grouping, menu dismissal and available/unavailable reset." },
  { id: "inspector-accordion", title: "Accordion section", purpose: "Group related inspector settings behind a collapsible section heading.", owner: "Existing shared ACM Studio inspector", consumers: "Block, template and document inspector sections.", blockHref: "/studio/ui/blocks/paragraph", states: "Expanded and collapsed; semantic disclosure control and contained settings." },
];

const controlGroupById: Record<string, string> = {
  "colour-picker": "Colour",
  "custom-font-size": "Sizing",
  "paragraph-length": "Sizing",
  "box-length": "Sizing",
  "inspector-tools": "Inspector",
  "inspector-accordion": "Inspector",
};
const entryGroups = entries.reduce<Map<string, typeof entries>>((groups, entry) => {
  const group = controlGroupById[entry.id];
  const groupEntries = groups.get(group) ?? [];
  groups.set(group, [...groupEntries, entry]);
  return groups;
}, new Map());

export function ControlsCatalogue() {
  const [activeEntry, setActiveEntry] = useState(entries[0].id);
  const [colour, setColour] = useState<string>();
  const [hoverColour, setHoverColour] = useState<string>();
  const [fontSize, setFontSize] = useState<string>();
  const [indent, setIndent] = useState<string>();
  const [padding, setPadding] = useState<string>();
  const [visible, setVisible] = useState(new Set<string>(["line-height"]));
  const [showInspectorExample, setShowInspectorExample] = useState(true);
  useEffect(() => {
    let frame = 0;
    const updateActiveEntry = () => {
      frame = 0;
      const trackingLine = Math.min(window.innerHeight * .15, 135);
      let nextActiveEntry = entries[0].id;
      let closestDistance = Number.POSITIVE_INFINITY;
      for (const entry of entries) {
        const section = document.getElementById(entry.id);
        if (!section) continue;
        const distance = Math.abs(section.getBoundingClientRect().top - trackingLine);
        if (distance < closestDistance) {
          closestDistance = distance;
          nextActiveEntry = entry.id;
        }
      }
      setActiveEntry(current => current === nextActiveEntry ? current : nextActiveEntry);
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActiveEntry);
    };
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("hashchange", scheduleUpdate);
    updateActiveEntry();
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("hashchange", scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  return <StudioUiLibrary section="controls"><div className="ui-controls-layout">
    <aside className="ui-catalogue-navigation" aria-label="Controls menu">
      <h2>Controls</h2>
      <nav aria-label="Control entries"><div className="ui-catalogue-navigation-groups">{[...entryGroups].map(([group, groupEntries]) => <section className="ui-catalogue-navigation-group" key={group}>
        <h3>{group}</h3>
        <ul className="ui-catalogue-navigation-list">{groupEntries.map(entry => <li key={entry.id}><a href={`#${entry.id}`} aria-current={activeEntry === entry.id ? "location" : undefined} onClick={() => setActiveEntry(entry.id)}>{entry.title}</a></li>)}</ul>
      </section>)}</div></nav>
    </aside>
    <main className="ui-controls-main ui-page-intro ui-controls-page">
    <p className="rl-eyebrow">Reusable internal components</p><h1>Controls</h1><p>Working Studio controls, their supported states, ownership and current consumers. Each example has isolated component state.</p>
    <section id="colour-picker" className="ui-control-entry"><header><h2>Colour picker</h2><p>{entries[0].purpose}</p></header><div className="ui-control-example"><ColourPicker label="Link colour" value={colour} onChange={setColour} hoverValue={hoverColour} onHoverChange={setHoverColour} wrapperClassName="ui-control-colour-picker" /><ColourPicker label="Disabled colour" value="#0088ff" onChange={() => {}} disabled wrapperClassName="ui-control-disabled" /><div className="ui-control-swatch-states" aria-label="Overlapping unset colour swatches"><ColourValueSwatch /><ColourValueSwatch overlap /></div><p>Default: {colour ?? "Unset"} · Hover: {hoverColour ?? "Unset"}</p></div><ControlFacts entry={entries[0]} /></section>
    <section id="custom-font-size" className="ui-control-entry"><header><h2>Custom font size</h2><p>{entries[1].purpose}</p></header><div className="ui-control-example ui-control-size-example"><CustomFontSizeSetting value={fontSize} onChange={setFontSize} /><p>Current value: {fontSize ?? "Default"}</p></div><ControlFacts entry={entries[1]} /></section>
    <section id="paragraph-length" className="ui-control-entry"><header><h2>Paragraph length</h2><p>{entries[2].purpose}</p></header><div className="ui-control-example ui-control-size-example"><ParagraphLengthSetting label="Line indent" value={indent} min={-100} max={300} onChange={setIndent} /><p>Current value: {indent ?? "Default"}</p></div><ControlFacts entry={entries[2]} /></section>
    <section id="box-length" className="ui-control-entry"><header><h2>Box dimensions</h2><p>{entries[3].purpose}</p></header><div className="ui-control-example ui-control-size-example"><BoxLengthSetting label="Padding" value={padding} layout="axes" min={0} max={120} onChange={setPadding} /><p>Current value: {padding ?? "Default"}</p></div><ControlFacts entry={entries[3]} /></section>
    <section id="inspector-tools" className="ui-control-entry"><header><h2>Inspector options and reset</h2><p>{entries[4].purpose}</p></header><div className="ui-control-example"><InspectorToolsSection title="Typography" options={[{ id: "line-height", label: "Line height" }, { id: "font-family", label: "Font family", source: "studio" }]} visible={visible} onToggle={id => setVisible(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onReset={() => setVisible(new Set())}>{showInspectorExample ? <label>Line height <input type="text" placeholder="Default" /></label> : null}</InspectorToolsSection><button type="button" onClick={() => setShowInspectorExample(value => !value)}><StudioIcon name="rotate" size={18} />Toggle example control</button></div><ControlFacts entry={entries[4]} /></section>
    <section id="inspector-accordion" className="ui-control-entry"><header><h2>Accordion section</h2><p>{entries[5].purpose}</p></header><div className="ui-control-example"><InspectorAccordionSection title="Example settings"><p>This content belongs to the open section.</p></InspectorAccordionSection></div><ControlFacts entry={entries[5]} /></section>
    <section className="ui-control-deferred"><h2>Potential reuse recorded for later</h2><p>Design, media, template and other catalogue controls remain with their current owners until a bounded migration confirms that the contracts fit. Ribbon catalogue specimens stay examples; inspector code does not import their demo implementation. Pane tabs are reused only by actual panes.</p></section>
    </main>
  </div></StudioUiLibrary>;
}

function ControlFacts({ entry }: { entry: typeof entries[number] }) {
  return <dl className="ui-control-facts"><div><dt>Ownership</dt><dd>{entry.owner}</dd></div><div><dt>Consumers</dt><dd>{entry.consumers} <a href={entry.blockHref}>Paragraph entry</a></dd></div><div><dt>Supported states</dt><dd>{entry.states}</dd></div></dl>;
}
