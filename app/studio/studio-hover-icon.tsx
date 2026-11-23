"use client";

import { AcmIcon } from "@andrewcharlesmoss/icons/react";
import type { IconName } from "@andrewcharlesmoss/icons";

export function StudioHoverIcon({ name, size = 24, vertical = false }: { name: IconName; size?: number; vertical?: boolean }) {
  return <AcmIcon className={vertical ? "studio-hover-icon is-vertical" : "studio-hover-icon"} name={name} scale="Regular-M" size={size} />;
}
