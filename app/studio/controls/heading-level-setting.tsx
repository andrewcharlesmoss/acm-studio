"use client";

import { AcmIcon } from "@acm/icons/react";
import type { IconName } from "@acm/icons";
import type { HeadingLevel } from "../../content/model";

const headingSymbols: Record<HeadingLevel, IconName> = {
  1: "text.heading-one", 2: "text.heading-two", 3: "text.heading-three",
  4: "text.heading-four", 5: "text.heading-five", 6: "text.heading-six",
};

export function HeadingLevelIcon({ level, size = 24 }: { level: HeadingLevel; size?: number }) {
  return <AcmIcon name={headingSymbols[level]} size={size} scale="Regular-M" />;
}

const headingLevels: HeadingLevel[] = [1, 2, 3, 4, 5, 6];

export function HeadingLevelSetting({ value, onChange, disabled = false }: {
  value: HeadingLevel;
  onChange: (level: HeadingLevel) => void;
  disabled?: boolean;
}) {
  return <div className="heading-level-setting" role="group" aria-label="Heading level">
    {headingLevels.map(level => <button key={level} type="button" disabled={disabled} aria-label={`Heading ${level}`} aria-pressed={value === level} title={`Heading ${level}`} onClick={() => onChange(level)}><HeadingLevelIcon level={level} /></button>)}
  </div>;
}
