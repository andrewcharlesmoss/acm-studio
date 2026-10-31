"use client";

import { StudioHoverIcon } from "../studio-hover-icon";

/** Toggle the Cover's existing minimum-height field to WordPress's viewport-height preset. */
export function CoverFullHeightToolbar({ minHeight, writable, onChange }: {
  minHeight: string | undefined;
  writable: boolean;
  onChange: (value: string | undefined) => void;
}) {
  const fullHeight = minHeight === "100vh";
  return <button
    type="button"
    className={fullHeight ? "is-active" : undefined}
    aria-label="Toggle full height"
    aria-pressed={fullHeight}
    title="Toggle full height"
    disabled={!writable}
    onMouseDown={event => event.preventDefault()}
    onClick={event => {
      event.stopPropagation();
      if (writable) onChange(fullHeight ? undefined : "100vh");
    }}
  ><StudioHoverIcon name="layout.align-stretch" /></button>;
}
