import { StudioIcon } from "../studio-icons";
import "./inserter-toggle-icon.css";

/** Inserter owners supply their current open state; the icon owns the transition. */
export function InserterToggleIcon({ open, size = 24 }: { open: boolean; size?: number }) {
  return <StudioIcon name="add" size={size} className={`studio-inserter-toggle-icon${open ? " is-open" : ""}`} />;
}
