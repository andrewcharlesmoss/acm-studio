"use client";

import { useRef, useState } from "react";
import type { IconName } from "@acm/icons";
import type { BlockAlignment, ContentBlock } from "../../content/model";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";
import { StudioHoverIcon } from "../studio-hover-icon";
import { preserveTextSelection } from "./editors/rich-text";
import { SocialIconsJustificationToolbar } from "./social-icons-justification-toolbar";

type SocialIconsBlock = Extract<ContentBlock, { type: "social-icons" }>;
type AlignmentChoice = { value: BlockAlignment | undefined; label: string; icon: IconName };

export function SocialIconChildToolbar({
  block,
  parent,
  orientation,
  alignment,
  alignmentChoices,
  writable,
  canMovePrevious,
  canMoveNext,
  onSelectParent,
  onAlignmentChange,
  onJustificationChange,
  onMove,
}: {
  block: Extract<ContentBlock, { type: "social-linkedin" | "social-tiktok" }>;
  parent: SocialIconsBlock;
  orientation: "horizontal" | "vertical";
  alignment: BlockAlignment | undefined;
  alignmentChoices: readonly AlignmentChoice[];
  writable: boolean;
  canMovePrevious: boolean;
  canMoveNext: boolean;
  onSelectParent: () => void;
  onAlignmentChange: (value: BlockAlignment | undefined) => void;
  onJustificationChange: (value: NonNullable<SocialIconsBlock["justification"]>) => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const [alignmentOpen, setAlignmentOpen] = useState(false);
  const alignmentTrigger = useRef<HTMLButtonElement | null>(null);
  const selectedAlignment = alignmentChoices.find(choice => choice.value === alignment) ?? alignmentChoices[0];
  const label = block.type === "social-linkedin" ? "LinkedIn icon" : "TikTok icon";
  const beforeLabel = orientation === "horizontal" ? "left" : "up";
  const afterLabel = orientation === "horizontal" ? "right" : "down";

  return <div className="social-icon-child-toolbar">
    <button type="button" onMouseDown={preserveTextSelection} onClick={onSelectParent} aria-label="Select parent block: Social Icons" title="Select parent block: Social Icons"><StudioHoverIcon name="social.icons" /></button>
    <div className="block-alignment-control">
      <button ref={alignmentTrigger} className={`block-alignment-button${alignmentOpen ? " is-active" : ""}`} type="button" disabled={!writable} onMouseDown={preserveTextSelection} onClick={() => setAlignmentOpen(value => !value)} aria-haspopup="menu" aria-expanded={alignmentOpen} aria-label="Align Social Icons block" title="Align Social Icons block">
        <StudioHoverIcon name={selectedAlignment.icon} /><StudioHoverIcon name="navigation.disclosure" size={16} />
      </button>
      {alignmentOpen ? <StudioAnchoredMenu presentation="custom" anchor={() => alignmentTrigger.current} className="block-alignment-menu" aria-label="Align Social Icons block" onClose={restore => { setAlignmentOpen(false); if (restore !== false) alignmentTrigger.current?.focus(); }}>
        {alignmentChoices.map(choice => <button className={choice.value === alignment ? "is-active" : ""} type="button" role="menuitemradio" aria-checked={choice.value === alignment} key={choice.value ?? "none"} disabled={!writable} onMouseDown={preserveTextSelection} onClick={() => {
          if (!writable) return;
          onAlignmentChange(choice.value);
          setAlignmentOpen(false);
          requestAnimationFrame(() => alignmentTrigger.current?.focus());
        }}><StudioHoverIcon name={choice.icon} /><span>{choice.label}</span></button>)}
      </StudioAnchoredMenu> : null}
    </div>
    <SocialIconsJustificationToolbar block={parent} writable={writable} onChange={onJustificationChange} />
    <div className="block-move-controls social-icon-move-controls" role="group" aria-label={`Move ${label}`}>
      <button className={orientation === "horizontal" ? "is-horizontal" : undefined} type="button" onMouseDown={preserveTextSelection} onClick={event => { event.stopPropagation(); onMove(-1); }} disabled={!writable || !canMovePrevious} aria-label={`Move ${label} ${beforeLabel}`} title={`Move ${beforeLabel}`}><StudioHoverIcon name={orientation === "horizontal" ? "arrange.move-down" : "arrange.move-up"} vertical={orientation === "horizontal"} /></button>
      <button className={orientation === "horizontal" ? "is-horizontal" : undefined} type="button" onMouseDown={preserveTextSelection} onClick={event => { event.stopPropagation(); onMove(1); }} disabled={!writable || !canMoveNext} aria-label={`Move ${label} ${afterLabel}`} title={`Move ${afterLabel}`}><StudioHoverIcon name={orientation === "horizontal" ? "arrange.move-up" : "arrange.move-down"} vertical={orientation === "horizontal"} /></button>
    </div>
  </div>;
}
