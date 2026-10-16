import { AcmIcon } from "@acm/icons/react";
import { StudioButton } from "./controls/button";
import type { LocalFixtureSiteId } from "./test-site/sites";

export type NavigationEditTarget = "drafts" | LocalFixtureSiteId;
export function navigationTargetName(target: NavigationEditTarget) {
  return target === "drafts" ? "Studio Drafts" : target === "test" ? "Test" : "Test2";
}

export function NavigationEditControls({ target, busy, editing, onEdit }: {
  target: NavigationEditTarget; busy: boolean; editing: boolean;
  onEdit: () => void;
}) {
  return <div className="navigation-edit-controls">
    {!editing ? <StudioButton id="studio-edit-site-navigation" type="button" variant="secondary" disabled={busy} onClick={onEdit} title={`Edit ${navigationTargetName(target)} navigation`}><AcmIcon name="navigation.menu" scale="Regular-S" size={20} />Edit navigation</StudioButton> : null}
  </div>;
}
