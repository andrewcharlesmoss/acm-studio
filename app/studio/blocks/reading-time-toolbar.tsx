"use client";

import { MetadataVariationControl } from "./metadata-variation-control";

/** Variations share the existing Reading Time record and owning history. */
export function ReadingTimeModeControl({ mode = "time", ...props }: {
  mode?: "time" | "words";
  writable: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (mode: "time" | "words") => void;
}) {
  return <MetadataVariationControl value={mode} label="Reading Time variation" icon="time.clock" choices={[
    { value: "time", label: "Time to Read", icon: "time.clock" },
    { value: "words", label: "Word Count", icon: "text.paragraph" },
  ]} {...props} />;
}
