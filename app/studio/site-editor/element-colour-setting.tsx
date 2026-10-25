"use client";
import { useId, useRef, useState } from "react";
import { ColourPicker, ColourValueSwatch } from "../controls/colour-picker";
import { GradientPicker } from "../controls/gradient-picker";
import { PaneTabs } from "../panes/pane-components";
import { paragraphBackgroundGradientCss } from "../../content/paragraph-styles";
import type { ParagraphBackgroundGradient } from "../../content/model";
import { previewStyleDetails, type StyleSelection } from "./styles-preview-state";
import { previewColourEntries, previewPaletteReference, previewColourValue, type PreviewGradient } from "./colours-preview-model";
import "../controls/palette-colour-setting.css";
import "./colours-preview.css";

/** One colour row for website-wide and block-scoped elements; owners retain saving and history. */
export function ElementColourSetting({ label, selection, foreground, background, gradient, gradientId, hover, backgroundEnabled = true, resetPaletteRole, onForeground, onBackground, onGradient, onHover }: {
  label: string; selection: StyleSelection; foreground?: string; background?: string;
  gradient?: ParagraphBackgroundGradient; gradientId?: string; hover?: string; backgroundEnabled?: boolean; resetPaletteRole?: string;
  onForeground: (colour?: string) => void; onBackground: (colour?: string) => void;
  onGradient: (gradient?: ParagraphBackgroundGradient, gradientId?: string) => void; onHover?: (colour?: string) => void;
}) {
  const [tab, setTab] = useState('text');
  const ownerRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const { palette } = previewStyleDetails(selection);
  const settings = selection.colours ?? {};
  const entries = previewColourEntries(palette, settings).map(({ key, label, colour }) => ({ key, label, colour }));
  const resolvedGradient = gradientId ? settings.gradients?.[gradientId]?.gradient ?? settings.retiredGradients?.[gradientId] ?? gradient : gradient;
  const isBackground = backgroundEnabled && tab === 'background';
  return <div ref={ownerRef} className="site-colours-element"><ColourPicker wrapperClassName="inspector-colour-row-setting" label={label} resetPaletteRole={resetPaletteRole} onSelectPalette={(entry, state) => {
    const reference = previewPaletteReference(entry.key);
    if (onHover && state === 'hover') onHover(reference);
    else if (isBackground) onBackground(reference);
    else onForeground(reference);
  }} value={isBackground ? background : foreground} onChange={colour => isBackground ? onBackground(colour) : onForeground(colour)} hoverValue={previewColourValue(hover, palette, settings)} onHoverChange={onHover} palette={entries} enableAlpha trigger={({ onClick, expanded, controls }) => <button type="button" className="inspector-colour-row" aria-label={`Choose ${label} colour`} aria-expanded={expanded} aria-controls={controls} onClick={onClick}><span className="inspector-colour-row-swatches" aria-hidden="true"><ColourValueSwatch value={foreground} />{backgroundEnabled ? <ColourValueSwatch overlap value={background} /> : onHover ? <ColourValueSwatch overlap value={previewColourValue(hover, palette, settings)} /> : null}</span><span>{label}</span></button>} beforeControls={backgroundEnabled ? <PaneTabs id={`element-colour-${id}`} label={`${label} colour type`} tabs={[{ id: 'text', label: 'Text' }, { id: 'background', label: 'Background' }, { id: 'gradient', label: 'Gradient' }]} active={tab} onChange={setTab} /> : undefined} hideColourControls={backgroundEnabled && tab === 'gradient'} additionalControls={backgroundEnabled && tab === 'gradient' ? <div className="site-colours-background"><GradientPicker inline ownerRef={ownerRef} value={resolvedGradient} active onOpen={() => {}} onChange={value => onGradient(value)} />{Object.values(settings.gradients ?? {}).filter((item): item is PreviewGradient => Boolean(item)).map(item => <button type="button" key={item.id} className="site-colours-gradient-choice" onClick={() => onGradient(item.gradient, item.id)}><i style={{ backgroundImage: `${paragraphBackgroundGradientCss(item.gradient)}, var(--studio-transparency-pattern)`, backgroundSize: "auto, var(--studio-transparency-size)" }} />{item.name}</button>)}</div> : undefined} /></div>;
}
