"use client";

import { MetadataVariationControl } from "./metadata-variation-control";

/** Date variations retain the owning document's publication/modification values. */
export function DateSourceControl({ source = "published", ...props }: {
  source?: "published" | "modified";
  writable: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (source: "published" | "modified") => void;
}) {
  return <MetadataVariationControl value={source} label="Date variation" icon="time.calendar" choices={[
    { value: "published", label: "Post Date", icon: "time.calendar" },
    { value: "modified", label: "Modified Date", icon: "time.calendar" },
  ]} {...props} />;
}
