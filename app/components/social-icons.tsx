import { AcmIcon } from "@acm/icons/react";
import { safeTextLink } from "../content/rich-text";
import { blockAlignmentClass } from "../content/block-alignment";
import type { ContentBlock, SocialIconBlock } from "../content/model";
import type { CSSProperties } from "react";

type SocialIconsBlock = Extract<ContentBlock, { type: "social-icons" }>;

export function socialIconsBlockClassName(block: SocialIconsBlock, editing = false) {
  return [
    "social-icons-block",
    editing && "is-editing",
    `is-${block.orientation ?? "horizontal"}`,
    block.allowWrap === false ? "is-no-wrap" : "is-wrapping",
    `justify-${block.justification ?? "left"}`,
    `size-${block.iconSize ?? "normal"}`,
    `is-style-${block.socialStyle ?? "default"}`,
    blockAlignmentClass(block),
  ].filter(Boolean).join(" ");
}

export function socialIconsGapStyle(block: SocialIconsBlock): CSSProperties {
  return {
    columnGap: block.horizontalGap === undefined ? undefined : `${block.horizontalGap}px`,
    rowGap: block.verticalGap === undefined ? undefined : `${block.verticalGap}px`,
  };
}

export function socialIconLabel(block: SocialIconBlock): string {
  return block.label?.trim() || (block.type === "social-linkedin" ? "LinkedIn" : "TikTok");
}

export function SocialIconView({ block, showLabel = false, openInNewTab = false, editing = false }: {
  block: SocialIconBlock;
  showLabel?: boolean;
  openInNewTab?: boolean;
  editing?: boolean;
}) {
  const label = socialIconLabel(block);
  const icon = <AcmIcon name={block.type === "social-linkedin" ? "brand.linkedin" : "brand.tiktok"} scale="Regular-M" size={24} />;
  const contents = <><span className="social-icon-glyph">{icon}</span>{showLabel ? <span className="social-icon-label">{label}</span> : null}</>;
  const url = safeTextLink(block.url);
  const className = `social-icon-item is-${block.type.slice(7)}`;
  const rel = [block.rel, openInNewTab ? "noopener noreferrer" : ""].filter(Boolean).join(" ") || undefined;
  // eslint-disable-next-line react/jsx-no-target-blank -- open-in-new-tab mode adds both safety tokens.
  if (!editing && url) return <a className={className} href={url} aria-label={label} target={openInNewTab ? "_blank" : undefined} rel={rel}>{contents}</a>;
  return <span className={className} aria-label={label} role={editing ? "img" : undefined}>{contents}</span>;
}
