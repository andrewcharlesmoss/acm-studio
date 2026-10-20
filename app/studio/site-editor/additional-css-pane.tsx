"use client";
import { useEffect, useMemo, useRef } from "react";
import { AcmIcon } from "@acm/icons/react";
import { TextArea } from "../controls/native-fields";
import { StudioButton } from "../controls/button";
import { compileAdditionalCss } from "./additional-css";

export function AdditionalCssPane({ value, authored, onChange, onReset, onBack }: { value: string; authored: boolean; onChange: (value: string) => void; onReset: () => void; onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const error = useMemo(() => typeof CSSStyleSheet === "undefined" ? undefined : compileAdditionalCss(value).error, [value]);
  useEffect(() => { heading.current?.focus(); }, []);
  return <div className="site-browse-styles site-additional-css">
    <div className="site-browse-styles-heading"><StudioButton variant="text" aria-label="Back to Styles" onClick={onBack}><AcmIcon name="navigation.chevron-left" size={20} scale="Regular-M" /></StudioButton><h3 tabIndex={-1} ref={heading}>Additional CSS</h3></div>
    <p>You can add custom CSS to further customise the appearance and layout of your site.</p>
    <div className="site-typography-section-heading"><label htmlFor="site-additional-css">Additional CSS</label>{authored ? <StudioButton variant="text" onClick={onReset}>Reset</StudioButton> : null}</div>
    <TextArea id="site-additional-css" value={value} onChange={event => onChange(event.currentTarget.value)} spellCheck={false} autoCapitalize="off" autoCorrect="off" aria-invalid={Boolean(error)} aria-describedby={error ? "site-additional-css-error" : undefined} />
    {error ? <p id="site-additional-css-error" role="status">{error}</p> : null}
  </div>;
}
