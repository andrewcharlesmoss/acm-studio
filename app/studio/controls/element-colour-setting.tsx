"use client";
import { useId, useRef, useState } from "react";
import { ColourPicker, ColourValueSwatch, type ColourPaletteEntry } from "./colour-picker";
import { GradientPicker } from "./gradient-picker";
import { PaneTabs } from "../panes/pane-components";
import { paragraphBackgroundGradientCss } from "../../content/paragraph-styles";
import type { ParagraphBackgroundGradient } from "../../content/model";
import "./palette-colour-setting.css";
import "./element-colour-setting.css";

/** One colour row for website-wide and block-scoped elements; owners retain saving and history. */
export function ElementColourSetting({ label, palette, paletteValue, gradientChoices = [], foreground, background, gradient, hover, backgroundEnabled = true, resetPaletteRole, onForeground, onBackground, onGradient, onHover }: {
  label: string; palette?: readonly ColourPaletteEntry[]; paletteValue?: (entry: ColourPaletteEntry) => string | undefined;
  gradientChoices?: readonly { id: string; name: string; gradient: ParagraphBackgroundGradient }[]; foreground?: string; background?: string;
  gradient?: ParagraphBackgroundGradient; hover?: string; backgroundEnabled?: boolean; resetPaletteRole?: string;
  onForeground: (colour?: string) => void; onBackground: (colour?: string) => void;
  onGradient: (gradient?: ParagraphBackgroundGradient, gradientId?: string) => void; onHover?: (colour?: string) => void;
}) {
  const [tab, setTab] = useState('text');
  const ownerRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const isBackground = backgroundEnabled && tab === 'background';
  return <div ref={ownerRef} className="site-colours-element"><ColourPicker wrapperClassName="inspector-colour-row-setting" label={label} resetPaletteRole={resetPaletteRole} onSelectPalette={(entry, state) => {
    const reference = paletteValue ? paletteValue(entry) : entry.colour;
    if (onHover && state === 'hover') onHover(reference);
    else if (isBackground) onBackground(reference);
    else onForeground(reference);
  }} value={isBackground ? background : foreground} onChange={colour => isBackground ? onBackground(colour) : onForeground(colour)} hoverValue={hover} onHoverChange={onHover} palette={palette} enableAlpha trigger={({ onClick, expanded, controls }) => <button type="button" className="inspector-colour-row" aria-label={`Choose ${label} colour`} aria-expanded={expanded} aria-controls={controls} onClick={onClick}><span className="inspector-colour-row-swatches" aria-hidden="true"><ColourValueSwatch value={foreground} />{backgroundEnabled ? <ColourValueSwatch overlap value={background} /> : onHover ? <ColourValueSwatch overlap value={hover} /> : null}</span><span>{label}</span></button>} beforeControls={backgroundEnabled ? <PaneTabs id={`element-colour-${id}`} label={`${label} colour type`} tabs={[{ id: 'text', label: 'Text' }, { id: 'background', label: 'Background' }, { id: 'gradient', label: 'Gradient' }]} active={tab} onChange={setTab} /> : undefined} hideColourControls={backgroundEnabled && tab === 'gradient'} additionalControls={backgroundEnabled && tab === 'gradient' ? <div className="site-colours-background"><GradientPicker inline ownerRef={ownerRef} value={gradient} active onOpen={() => {}} onChange={value => onGradient(value)} />{gradientChoices.map(item => <button type="button" key={item.id} className="site-colours-gradient-choice" onClick={() => onGradient(item.gradient, item.id)}><i style={{ backgroundImage: `${paragraphBackgroundGradientCss(item.gradient)}, var(--studio-transparency-pattern)`, backgroundSize: "auto, var(--studio-transparency-size)" }} />{item.name}</button>)}</div> : undefined} /></div>;
}
