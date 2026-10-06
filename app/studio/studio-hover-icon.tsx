"use client";

import { AcmIcon } from "@acm/icons/react";
import type { IconName } from "@acm/icons";

export function StudioHoverIcon({ name, size = 24, vertical = false }: { name: IconName; size?: number; vertical?: boolean }) {
  return <AcmIcon className={vertical ? "studio-hover-icon is-vertical" : "studio-hover-icon"} name={name} scale="Regular-M" size={size} />;
}
