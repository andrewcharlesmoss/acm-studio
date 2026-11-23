"use client";

import { AcmIcon } from "@andrewcharlesmoss/icons/react";
import "./inherited-indicator.css";

/** Decorative mark; the owning control supplies its accessible name. */
export function InheritedIndicator() {
  return <span className="studio-inherited-indicator" aria-hidden="true"><AcmIcon name="state.inherited" scale="Regular-S" size={16} /></span>;
}
