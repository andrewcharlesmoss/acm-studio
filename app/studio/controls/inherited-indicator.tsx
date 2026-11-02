"use client";

import { AcmIcon } from "@acm/icons/react";
import "./inherited-indicator.css";

/** Decorative mark; the owning control supplies its accessible name. */
export function InheritedIndicator() {
  return <span className="studio-inherited-indicator" aria-hidden="true"><AcmIcon name="state.inherited" size={16} /></span>;
}
