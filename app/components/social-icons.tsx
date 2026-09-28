import { AcmIcon } from "@acm/icons/react";
import { safeTextLink } from "../content/rich-text";
import type { SocialIconBlock } from "../content/model";

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
  if (!editing && url) return <a className={className} href={url} aria-label={label} target={openInNewTab ? "_blank" : undefined} rel={openInNewTab ? "noopener noreferrer" : undefined}>{contents}</a>;
  return <span className={className} aria-label={label} role={editing ? "img" : undefined}>{contents}</span>;
}
