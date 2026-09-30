"use client";

import { useEffect } from "react";
import { studioControlEntryById } from "../../controls/library-catalogue";

export function LegacyControlHashRedirect() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (studioControlEntryById[id]) window.location.replace(`/studio/ui/controls/${encodeURIComponent(id)}`);
  }, []);
  return null;
}
