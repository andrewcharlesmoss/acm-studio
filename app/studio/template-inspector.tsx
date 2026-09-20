"use client";
import { useState } from "react";
import type { ContentBlock } from "../content/model";
import { BlockInspector } from "./studio-inspectors";
import { templateId, templateElementLabel, type TemplateSet, type PageTemplate, type TemplatePart, type SiteLink, type SiteStyles } from "./template-model";

export function TemplateTextSetting({ label, value, onCommit, placeholder }: { label: string; value: string; onCommit: (value: string) => void; placeholder?: string }) {
  return <label>{label}<input key={value} defaultValue={value} placeholder={placeholder} onBlur={event => { if (event.target.value !== value) onCommit(event.target.value); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label>;
}

function LinkSettings({ title, links, onChange }: { title: string; links: SiteLink[]; onChange: (links: SiteLink[]) => void }) {
  const [label, setLabel] = useState(""); const [url, setUrl] = useState("");
  return <section><h3>{title}</h3>{links.map((link, index) => <div key={link.id} className="template-link-item">
    <TemplateTextSetting label="Link Label" value={link.label} onCommit={label => onChange(links.map(item => item.id === link.id ? { ...item, label } : item))} />
    <TemplateTextSetting label="Destination" value={link.url} onCommit={url => onChange(links.map(item => item.id === link.id ? { ...item, url } : item))} />
    <button type="button" disabled={!index} onClick={() => { const next = [...links]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; onChange(next); }}>Move Up</button>{" "}
    <button type="button" onClick={() => onChange(links.filter(item => item.id !== link.id))}>Remove Link</button>
  </div>)}<label>New Link Label<input value={label} onChange={event => setLabel(event.target.value)} placeholder={title === "Social and support" ? "LinkedIn or Buy Me a Coffee" : "About"} /></label><label>New Destination<input value={url} onChange={event => setUrl(event.target.value)} placeholder="https://… or /page" /></label><button type="button" disabled={!label.trim() || !url.trim()} onClick={() => { onChange([...links, { id: templateId(), label: label.trim(), url: url.trim() }]); }}>Add Link</button></section>;
}

export function TemplateInspector({ set, target, selectedBlock, writable, onChange, onBlockChange, onOpenMedia, onEditPart, users }: {
  set: TemplateSet; target: PageTemplate | TemplatePart; selectedBlock: ContentBlock | null; writable: boolean;
  onChange: (set: TemplateSet) => void; onBlockChange: (block: ContentBlock) => void; onOpenMedia: (logo?: boolean) => void; onEditPart: (id: string) => void; users: string[];
}) {
  const [tab, setTab] = useState<"template" | "styles" | "block">("template");
  const element = selectedBlock?.type === "group" ? selectedBlock.data?.templateElement : undefined;
  const partId = selectedBlock?.type === "group" ? selectedBlock.data?.templatePart : undefined;
  const templateTarget = target.kind === "page" || target.kind === "post" ? target : undefined;
  const defaults = templateTarget?.defaults ?? set.defaults ?? {};
  const changeDefaults = (next: NonNullable<TemplateSet["defaults"]>) => onChange(templateTarget ? { ...set, templates: set.templates.map(template => template.id === templateTarget.id ? { ...template, defaults: next } : template) } : { ...set, defaults: next });
  const changeStyle = (key: keyof SiteStyles, value: string | number) => onChange({ ...set, styles: { ...set.styles, [key]: value } });
  return <aside className="studio-inspector template-inspector">
    <div className="inspector-tabs" role="tablist" aria-label="Template settings">{(["template", "block", "styles"] as const).map(item => <button type="button" key={item} role="tab" aria-selected={tab === item} className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>{item === "template" ? "Template" : item === "block" ? "Block" : "Styles"}</button>)}</div>
    <div className="inspector-scroll"><fieldset disabled={!writable}>
      {tab === "block" ? selectedBlock ? element ? <><h2>{templateElementLabel(String(element))}</h2><p>Content is supplied by the preview document or site identity.</p><label>Alignment<select value={String(selectedBlock.type === "group" ? selectedBlock.data?.align ?? "left" : "left")} onChange={event => onBlockChange({ ...selectedBlock, data: { ...(selectedBlock.type === "group" ? selectedBlock.data : {}), align: event.target.value } } as ContentBlock)}><option value="left">Left</option><option value="centre">Centre</option><option value="right">Right</option></select></label></> : partId ? <><h2>Shared part</h2><label>Part<select value={String(partId)} onChange={event => onBlockChange({ ...selectedBlock, data: { templatePart: event.target.value } } as ContentBlock)}>{set.parts.map(part => <option value={part.id} key={part.id}>{part.name}</option>)}</select></label><button type="button" onClick={() => onEditPart(String(partId))}>Edit {set.parts.find(part => part.id === partId)?.name}</button></> : <BlockInspector block={selectedBlock} onChange={onBlockChange} onOpenFiles={() => onOpenMedia()} canOpenFiles /> : <p>Select a block in the canvas or List View.</p> : tab === "styles" ? <>
        <h2>Shared styles</h2><p>Applies to every template in {set.name}. Explicit block styles take precedence.</p>
        {(["background", "text", "accent", "border"] as const).map(key => <label key={key}>{key.charAt(0).toUpperCase() + key.slice(1)} Colour<input type="color" value={set.styles[key]} onChange={event => changeStyle(key, event.target.value)} /></label>)}
        <label>Typeface<select value={set.styles.font} onChange={event => changeStyle("font", event.target.value)}><option value="inter">Inter</option><option value="serif">Georgia</option></select></label>
        {([["fontSize", "Body Text Size", 13, 40], ["spacing", "Spacing", 0, 120], ["contentWidth", "Content Width", 320, 1800], ["radius", "Corner Radius", 0, 80], ["borderWidth", "Border Width", 0, 12]] as const).map(([key, label, min, max]) => <label key={key}>{label} (px)<input type="number" min={min} max={max} key={`${key}-${set.styles[key]}`} defaultValue={set.styles[key]} onBlur={event => { if (event.target.value && Number(event.target.value) !== set.styles[key]) changeStyle(key, Number(event.target.value)); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label>)}
      </> : <>
        <h2>{target.name}</h2><p>{target.kind === "header" || target.kind === "footer" ? `Used by: ${users.join(", ") || "No templates yet"}.` : `Reusable ${target.kind} layout. Keep exactly one Content element.`}</p>
        <section><h3>Template defaults</h3><p>Documents inherit these values until they explicitly override them.</p>{templateTarget ? <><TemplateTextSetting label="Author" value={defaults.author ?? ""} placeholder="No default author" onCommit={author => changeDefaults({ ...defaults, author: author || undefined })} />{target.kind === "post" ? <><label>Category<select value={defaults.category ?? ""} onChange={event => changeDefaults({ ...defaults, category: (event.target.value || undefined) as NonNullable<TemplateSet["defaults"]>["category"] })}><option value="">No default category</option><option>Technology</option><option>Excel</option><option>Personal</option></select></label><TemplateTextSetting label="Tags" value={(defaults.tags ?? []).join(", ")} placeholder="No default tags" onCommit={value => changeDefaults({ ...defaults, tags: value.split(",").map(tag => tag.trim()).filter(Boolean) })} /></> : null}</> : <p className="setting-note">Shared parts do not own document defaults.</p>}</section>
        <h3>Site identity</h3><TemplateTextSetting label="Site Name" value={set.identity.name} onCommit={name => onChange({ ...set, identity: { ...set.identity, name } })} />
        <TemplateTextSetting label="Home Address" value={set.identity.homeUrl} onCommit={homeUrl => onChange({ ...set, identity: { ...set.identity, homeUrl } })} />
        <TemplateTextSetting label="Copyright" value={set.identity.copyright} onCommit={copyright => onChange({ ...set, identity: { ...set.identity, copyright } })} />
        <button type="button" onClick={() => onOpenMedia(true)}>Choose Logo</button>{set.identity.logo ? <><TemplateTextSetting label="Logo Alternative Text" value={set.identity.logo.alt} onCommit={alt => onChange({ ...set, identity: { ...set.identity, logo: { ...set.identity.logo!, alt } } })} /><button type="button" onClick={() => onChange({ ...set, identity: { ...set.identity, logo: undefined } })}>Remove Logo</button></> : null}
        <LinkSettings title="Navigation" links={set.navigation} onChange={navigation => onChange({ ...set, navigation })} />
        <LinkSettings title="Social and support" links={set.socialLinks} onChange={socialLinks => onChange({ ...set, socialLinks })} />
      </>}
    </fieldset></div>
  </aside>;
}
