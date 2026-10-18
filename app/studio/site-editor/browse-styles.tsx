import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { AcmIcon } from "@acm/icons/react";
import { StudioButton } from "../controls/button";
import { stylePalettes, styleTypography, styleVariations } from "./style-reference-data";
import { previewStyleDetails, type StyleSelection } from "./styles-preview-state";

/** One choice presentation for full variations, palettes, and font pairings. */
function StyleChoices({ label, kind, children }: { label: string; kind: "variation" | "palette" | "typography"; children: ReactNode }) {
  return <div role="group" aria-label={label} className={`site-style-choices site-style-choices--${kind}`}>{children}</div>;
}

/** Gutenberg previews the heading/body pairing at the nearest regular weight. */
export function StyleTypographySample({ typography }: { typography: typeof styleTypography[number] }) {
  return <span aria-hidden="true" style={{ fontWeight: 400, fontStyle: "normal" }}><span style={{ fontFamily: typography.headingFamily }}>A</span><span style={{ fontFamily: typography.bodyFamily }}>a</span></span>;
}

export function BrowseStyles({ selection, onChange, onBack, inherited, onInherit }: {
  selection: StyleSelection; onChange: (patch: Partial<StyleSelection>) => void; onBack: () => void;
  inherited?: boolean; onInherit?: () => void;
}) {
  const current = previewStyleDetails(selection);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <div className="site-browse-styles">
    <div className="site-browse-styles-heading"><StudioButton variant="text" aria-label="Back to Styles" title="Back to Styles" onClick={onBack}><AcmIcon name="navigation.chevron-left" size={20} scale="Regular-M" /></StudioButton><h3 ref={heading} tabIndex={-1}>Browse Styles</h3></div>
    <p>Choose a variation to change the look of the site.</p>
    {onInherit ? <p className="site-style-inheritance">{inherited ? "Using Global Defaults." : <StudioButton variant="text" onClick={onInherit}>Use Global Defaults</StudioButton>}</p> : null}
    <StyleChoices kind="variation" label="Style variations">
      {styleVariations.map(item => {
        const { palette, typography } = previewStyleDetails(item);
        return <button type="button" className="site-style-choice" key={item.id} aria-label={item.name} aria-pressed={current.variation?.id === item.id} onClick={() => onChange({ paletteId: item.paletteId, typographyId: item.typographyId })} style={{ "--variation-base": palette.colours[0], "--variation-contrast": palette.text, "--variation-heading": palette.heading, "--variation-accent": palette.buttonBackground, "--variation-tint": palette.colours[2], fontFamily: typography.headingFamily, fontWeight: typography.headingWeight } as CSSProperties}>
          <span aria-hidden="true" className="site-style-variation-sample"><StyleTypographySample typography={typography} /><span className="site-style-variation-dots"><i /><i /></span></span>
          <span aria-hidden="true" className="site-style-variation-wash">{palette.colours.slice(0, 4).map((colour, index) => <i key={index} style={{ background: colour }} />)}</span>
          <span aria-hidden="true" className="site-style-variation-label">{item.name}</span>
        </button>;
      })}
    </StyleChoices>
    <section><h3>Colour Variations</h3><StyleChoices kind="palette" label="Colour variations">{stylePalettes.map(item => <button type="button" className="site-style-choice" key={item.id} aria-label={`${item.name} colours`} title={item.name} aria-pressed={selection.paletteId === item.id} onClick={() => onChange({ paletteId: item.id })}><span className="site-style-palette-sample" aria-hidden="true">{item.colours.slice(0, 4).map((colour, index) => <span style={{ background: colour }} key={index} />)}</span></button>)}</StyleChoices></section>
    <section><h3>Typography</h3><TypographyChoices selected={selection.typographyId} onChange={typographyId => onChange({ typographyId })} /></section>
  </div>;
}

export function TypographyChoices({ selected, onChange }: { selected: StyleSelection["typographyId"]; onChange: (id: StyleSelection["typographyId"]) => void }) {
  return <StyleChoices kind="typography" label="Typography variations">{styleTypography.map(item => <button type="button" className="site-style-choice" key={item.id} aria-label={`${item.name} typography`} title={item.name} aria-pressed={selected === item.id} onClick={() => onChange(item.id)}><StyleTypographySample typography={item} /></button>)}</StyleChoices>;
}
