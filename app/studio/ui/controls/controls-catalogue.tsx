"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { controlGroupId, studioControlEntries, studioControlGroups } from "../../controls/library-catalogue";
import { deriveSliderStateColour } from "../../controls/range-colours";
import { ControlSpecimen } from "./control-specimen";
import { ControlsNavigation } from "./controls-navigation";

export function ControlsCatalogue() {
  const [sliderAccent, setSliderAccent] = useState<string | null>(null);
  const [sliderHoverAccent, setSliderHoverAccent] = useState<string | null>(null);
  const [sliderPressAccent, setSliderPressAccent] = useState<string | null>(null);
  const [sliderDefaultAccent, setSliderDefaultAccent] = useState("#3858e9");
  const layoutRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const styleTarget = layoutRef.current?.closest(".studio-shell") ?? document.documentElement;
    const style = getComputedStyle(styleTarget);
    const accent = style.getPropertyValue("--studio-range-accent").trim() || style.getPropertyValue("--gutenberg-accent").trim();
    if (/^#[\da-f]{6}$/i.test(accent)) setSliderDefaultAccent(accent);
  }, []);
  const effectiveSliderAccent = sliderAccent ?? sliderDefaultAccent;
  const effectiveSliderHoverAccent = sliderHoverAccent ?? deriveSliderStateColour(effectiveSliderAccent);
  const effectiveSliderPressAccent = sliderPressAccent ?? deriveSliderStateColour(effectiveSliderHoverAccent);
  const layoutStyle = {
    "--studio-range-accent": effectiveSliderAccent,
    "--studio-range-hover-accent": effectiveSliderHoverAccent,
    "--studio-range-pressed-accent": effectiveSliderPressAccent,
  } as CSSProperties;
  return <div ref={layoutRef} className="ui-controls-layout" style={layoutStyle}>
    <ControlsNavigation />
    <section className="ui-controls-main ui-page-intro ui-controls-page" aria-labelledby="ui-controls-title">
      <p className="rl-eyebrow">Reusable inspector components</p>
      <h1 id="ui-controls-title">Controls</h1>
      <p>Shared control foundations and working specimens live on this page. Use the grouped jump links to move between examples; each one has isolated state, a reset action and details about its actual consumers.</p>
      {studioControlGroups.map(group => {
        const entries = studioControlEntries.filter(entry => entry.group === group);
        if (!entries.length) return null;
        return <section className="ui-control-group" id={controlGroupId(group)} key={group} aria-labelledby={`${controlGroupId(group)}-heading`}>
          <h2 id={`${controlGroupId(group)}-heading`}>{group}</h2>
          <div className="ui-control-group-specimens">{entries.map(entry => <ControlSpecimen entry={entry} key={entry.id} sliderAccent={effectiveSliderAccent} sliderHoverAccent={effectiveSliderHoverAccent} sliderPressAccent={effectiveSliderPressAccent} onSliderAccentChange={setSliderAccent} onSliderHoverAccentChange={setSliderHoverAccent} onSliderPressAccentChange={setSliderPressAccent} />)}</div>
        </section>;
      })}
    </section>
  </div>;
}
