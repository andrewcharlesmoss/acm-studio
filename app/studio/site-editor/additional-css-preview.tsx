"use client";
import { useMemo, type ReactNode } from "react";
import { compileAdditionalCss } from "./additional-css";

/** Containment belongs outside the authored scope and cannot be disabled by its CSS. */
export function AdditionalCssPreview({ source, children }: { source: string; children: ReactNode }) {
  const compiled = useMemo(() => typeof CSSStyleSheet === "undefined" ? "" : compileAdditionalCss(source).css, [source]);
  return <div className="site-custom-css-boundary"><style>{compiled}</style><div data-site-custom-css-root>{children}</div></div>;
}
