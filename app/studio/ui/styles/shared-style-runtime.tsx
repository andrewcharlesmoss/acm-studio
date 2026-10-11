"use client";

import { useEffect, useRef } from "react";
import { universalStylePresetToCssVariables, validateUniversalStylePreset } from "@acm/styles";
import { createSharedStylesClient } from "./shared-styles-client.mjs";

/** Explicit source refresh avoids remounting drafts when preset JSON HMR is suppressed. */
export function SharedStyleRuntime() {
  const sessionToken = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const client = createSharedStylesClient();
    let epoch = 0;
    let active = true;
    let reading = false;
    let queued = false;
    async function refresh() {
      if (reading) { queued = true; epoch++; return; }
      reading = true;
      const request = ++epoch;
      try {
        const source = await client.load(sessionToken.current);
        sessionToken.current = source.token;
        const variables = universalStylePresetToCssVariables(validateUniversalStylePreset(source.preset));
        if (!active || request !== epoch) return;
        for (const [key, value] of Object.entries(variables)) document.body.style.setProperty(key, value);
        document.body.style.setProperty("--studio-selection-colour", variables["--acm-interaction-selection-colour"]);
        for (const [alias, token] of [["accent", "accent"], ["hover-accent", "hover"], ["pressed-accent", "pressed"]]) {
          document.body.style.setProperty(`--studio-range-${alias}`, variables[`--acm-interaction-control-${token}-colour`]);
        }
        for (const key of ["background", "foreground", "border", "hover-background", "hover-foreground"]) {
          document.body.style.setProperty(`--studio-shared-button-${key}`, variables[`--acm-button-base-${key}`]);
        }
      } catch { /* Hosted/offline routes retain their bundled executable preset. */ }
      finally {
        reading = false;
        if (active && queued) { queued = false; void refresh(); }
      }
    }
    const channel = new BroadcastChannel("studio-shared-styles-refresh");
    channel.onmessage = () => { void refresh(); };
    const listener = () => { void refresh(); };
    window.addEventListener("studio-shared-styles-saved", listener);
    window.addEventListener("focus", listener);
    void refresh();
    return () => {
      active = false;
      channel.close();
      window.removeEventListener("studio-shared-styles-saved", listener);
      window.removeEventListener("focus", listener);
    };
  }, []);
  return null;
}
