"use client";

import { AcmIcon } from "@acm/icons/react";
import type { ReactNode } from "react";
import { RadioGroup } from "./radio-group";

type TextStyleChoice = {
  value: string;
  label: ReactNode;
  accessibleName: string;
  title: string;
};

const decorationChoices: readonly TextStyleChoice[] = [
  { value: "none", label: <AcmIcon name="action.remove" size={20} />, accessibleName: "None", title: "None" },
  { value: "underline", label: <AcmIcon name="text.underline" size={20} />, accessibleName: "Underline", title: "Underline" },
  { value: "line-through", label: <AcmIcon name="text.strikethrough" size={20} />, accessibleName: "Strikethrough", title: "Strikethrough" },
];

const letterCaseChoices: readonly TextStyleChoice[] = [
  { value: "none", label: <AcmIcon name="action.remove" size={20} />, accessibleName: "None", title: "None" },
  { value: "uppercase", label: "AB", accessibleName: "Uppercase", title: "Upper" },
  { value: "lowercase", label: "ab", accessibleName: "Lowercase", title: "Lower" },
  { value: "capitalize", label: "Ab", accessibleName: "Title case", title: "Title" },
];

export function TypographyTextChoices({ kind, value, onChange }: {
  kind: "decoration" | "letter-case";
  value?: string;
  onChange: (value: string) => void;
}) {
  const label = kind === "decoration" ? "Decoration" : "Letter case";
  const options = kind === "decoration" ? decorationChoices : letterCaseChoices;
  return <div className={`typography-text-choices is-${kind}`}><RadioGroup label={label} presentation="buttons" value={value} options={options} onChange={onChange} /></div>;
}
