import { AcmIcon } from "@acm/icons/react";
import { StudioButton } from "./controls/button";
import type { LocalFixtureSiteId } from "./test-site/sites";

export type NavigationEditTarget = "drafts" | LocalFixtureSiteId;
export function navigationTargetName(target: NavigationEditTarget) {
  return target === "drafts" ? "Studio Drafts" : target === "test" ? "Test" : "Test2";
}

export function NavigationEditControls({ target, busy, editing, onChange, onEdit }: {
  target: NavigationEditTarget; busy: boolean; editing: boolean;
  onChange: (target: NavigationEditTarget) => void; onEdit: () => void;
}) {
  return <div className="navigation-edit-controls">
    <label>Navigation target<select value={target} disabled={busy} onChange={event => {
      const value = event.target.value;
      if (value === "drafts" || value === "test" || value === "test2") onChange(value);
    }}><option value="drafts">Studio Drafts</option><option value="test">Test</option><option value="test2">Test2</option></select></label>
    {!editing ? <StudioButton id="studio-edit-site-navigation" type="button" variant="secondary" disabled={busy} onClick={onEdit} title={`Edit ${navigationTargetName(target)} navigation`}><AcmIcon name="navigation.menu" scale="Regular-S" size={20} />Edit navigation</StudioButton> : null}
  </div>;
}
