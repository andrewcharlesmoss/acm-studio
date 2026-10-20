"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch } from "react";
import { AcmIcon } from "@acm/icons/react";
import { StudioButton } from "../controls/button";
import { ColourPicker, ColourValueSwatch } from "../controls/colour-picker";
import { GradientPicker } from "../controls/gradient-picker";
import { FocalPositionSetting } from "../controls/focal-position-setting";
import { ToggleSetting } from "../controls/toggle-setting";
import { NumberUnitField } from "../controls/number-unit-field";
import { useBlobUrls } from "../controls/use-blob-urls";
import { InspectorToolsSection } from "../inspector-tools-section";
import { StudioAnchoredPopover } from "../overlays/anchored-popover";
import { PopoverHeading } from "../overlays/popover-heading";
import { IdentityImagePicker } from "./identity-image-picker";
import { previewColourEntries, previewColourValue, previewPaletteReference } from "./colours-preview-model";
import { previewStyleDetails, type StyleAction, type StyleSelection } from "./styles-preview-state";
import { backgroundImageFields, type PreviewBackground, type BackgroundWidthUnit } from "./background-preview-model";
import type { PreviewScope } from "./identity-preview-state";
import "./background-preview.css";

const options = [{ id: "image", label: "Image", disabled: true }, { id: "colour", label: "Colour", disabled: true }, { id: "gradient", label: "Gradient", disabled: true }];
const visible = new Set(options.map(option => option.id));
export function BackgroundPreview({ selection, authored, scope, dispatch, onBack }: { selection: StyleSelection; authored: Partial<StyleSelection>; scope: PreviewScope; dispatch: Dispatch<StyleAction>; onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const imageTrigger = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [picker, setPicker] = useState<HTMLElement | null>(null);
  const [gradientActive, setGradientActive] = useState(false);
  const background = selection.background ?? {};
  const { palette } = previewStyleDetails(selection);
  const images = useMemo(() => background.image ? [background.image] : [], [background.image]);
  const urls = useBlobUrls(images);
  const entries = previewColourEntries(palette, selection.colours).map(({ key, label, colour }) => ({ key, label, colour }));
  const colour = previewColourValue(background.colour ?? undefined, palette, selection.colours) || palette.colours[0];
  const resettable = new Set(options.filter(option => option.id === "image" ? backgroundImageFields.some(field => authored.background?.[field] !== undefined) : authored.background?.[option.id as "colour" | "gradient"] !== undefined).map(option => option.id));
  const change = (patch: PreviewBackground) => dispatch({ type: "background", scope, patch });
  useEffect(() => { heading.current?.focus(); }, []);
  function closeImage(restore: boolean) { setImageOpen(false); if (restore) imageTrigger.current?.focus(); }
  return <div className="site-browse-styles site-background-preview">
    <div className="site-browse-styles-heading"><StudioButton variant="text" aria-label="Back to Styles" onClick={onBack}><AcmIcon name="navigation.chevron-left" size={20} /></StudioButton><h3 ref={heading} tabIndex={-1}>Background</h3></div>
    <p className="site-background-description">Set styles for the site&apos;s background.</p>
    <InspectorToolsSection title="Background" options={options} visible={visible} showCloseControl={false} alwaysShow canReset={resettable.size > 0} resettableOptions={resettable} onResetOption={field => dispatch({ type: "reset-background", scope, field: field as "image" | "colour" | "gradient" })} onToggle={() => {}} onReset={() => dispatch({ type: "reset-background", scope })}>
      <div className="paragraph-background-modes site-background-rows">
        <div className="paragraph-background-option-row"><button ref={imageTrigger} type="button" className="paragraph-background-option" aria-label={background.image ? `Background image: ${background.image.name}` : "Choose background image"} aria-expanded={imageOpen} onClick={event => { if (background.image) setImageOpen(open => !open); else setPicker(event.currentTarget); }}>
          <span className={`site-background-image-swatch paragraph-background-mode-swatch is-image${background.image ? " has-colour" : ""}`} aria-hidden="true">{background.image && urls[background.image.id] ? (
            // Existing local Files bytes are managed by useBlobUrls.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urls[background.image.id]} alt="" />
          ) : null}</span><span>{background.image?.name ?? "Image"}</span>
        </button></div>
        <ColourPicker label="Background" palette={entries} enableAlpha resetPaletteRole="theme-0" value={colour} onSelectPalette={entry => change({ colour: previewPaletteReference(entry.key) })} onChange={value => change({ colour: value ?? null })} trigger={({ onClick, expanded, controls }) => <div className="paragraph-background-option-row"><button type="button" className="paragraph-background-option" aria-label="Choose background colour" aria-expanded={expanded} aria-controls={controls} onClick={onClick}><ColourValueSwatch value={colour} /><span>Colour</span></button></div>} />
        <div className="paragraph-background-option-row paragraph-gradient-option-row"><GradientPicker value={background.gradient ?? undefined} active={gradientActive} onOpen={() => setGradientActive(true)} onChange={gradient => change({ gradient: gradient ?? null })} /></div>
      </div>
    </InspectorToolsSection>
    {imageOpen && background.image ? <StudioAnchoredPopover anchor={() => imageTrigger.current} label="Background image" preferredWidth={320} inspectorPlacement focusOnMount initialFocus={() => closeRef.current} onClose={closeImage} className="site-background-image-popup">
      <PopoverHeading closeRef={closeRef} closeLabel="Close background image settings" onClose={() => closeImage(true)}>Image</PopoverHeading>
      <div className="site-background-image-actions"><StudioButton variant="text" onClick={() => { setPicker(imageTrigger.current); closeImage(false); }}>Replace</StudioButton><StudioButton variant="text" onClick={() => { change({ image: null }); closeImage(true); }}>Remove</StudioButton></div>
      <FocalPositionSetting x={background.focalX ?? 50} y={background.focalY ?? 50} onXChange={focalX => change({ focalX })} onYChange={focalY => change({ focalY })} />
      <ToggleSetting label="Fixed background" checked={background.fixed ?? false} onChange={fixed => change({ fixed })} />
      <fieldset className="site-background-size"><legend>Size</legend>{(["cover", "contain", "tile"] as const).map(size => <label key={size}><input type="radio" name={`background-size-${scope}`} value={size} checked={(background.size ?? "cover") === size} onChange={() => change({ size })} />{size[0].toUpperCase() + size.slice(1)}</label>)}</fieldset>
      {background.size === "tile" ? <><div className="site-background-width"><label htmlFor="background-image-width">Width</label><NumberUnitField units={["px", "%", "em", "rem", "vw", "vh"]} inputProps={{ id: "background-image-width", "aria-label": "Background image width", min: 1, max: 10000, value: background.width ?? 100, onChange: event => { const width = Number(event.currentTarget.value); if (Number.isFinite(width) && width > 0) change({ width: Math.min(10000, width) }); } }} unitProps={{ "aria-label": "Background image width unit", value: background.widthUnit ?? "%", onChange: event => change({ widthUnit: event.currentTarget.value as BackgroundWidthUnit }) }} /></div><ToggleSetting label="Repeat" checked={background.repeat ?? true} onChange={repeat => change({ repeat })} /></> : null}
    </StudioAnchoredPopover> : null}
    {picker ? <IdentityImagePicker title="Choose Background Image" opener={picker} onClose={() => setPicker(null)} onChoose={image => { change({ image }); setPicker(null); }} /> : null}
  </div>;
}
