"use client";

import { useEffect, useRef } from "react";
import { interfaceStylePresetToCssVariables, universalStylePresetToCssVariables, validateInterfaceStylePreset, validateUniversalStylePreset } from "@acm/styles";
import { createSharedStylesClient } from "./shared-styles-client.mjs";
import { publishSharedStylePreset } from "./shared-style-preset";
import { publishSharedInterfaceStylePreset } from "./shared-interface-style-preset";
import { installCanonicalStyleGuide } from "./canonical-style-guide";

/** Explicit source refresh avoids remounting drafts when guide HMR is suppressed. */
export function SharedStyleRuntime() {
  const websiteSessionToken = useRef<string | undefined>(undefined);
  const interfaceSessionToken = useRef<string | undefined>(undefined);
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
        const [websiteSource, interfaceSource] = await Promise.all([
          client.load(websiteSessionToken.current),
          createSharedStylesClient({ scope: "interface" }).load(interfaceSessionToken.current),
        ]);
        websiteSessionToken.current = websiteSource.token;
        interfaceSessionToken.current = interfaceSource.token;
        const websitePreset = validateUniversalStylePreset(websiteSource.preset);
        const interfacePreset = validateInterfaceStylePreset(interfaceSource.preset);
        if (!active || request !== epoch) return;
        installCanonicalStyleGuide(websiteSource.source.document);
        const websiteVariables = universalStylePresetToCssVariables(websitePreset);
        const interfaceVariables = interfaceStylePresetToCssVariables(interfacePreset);
        publishSharedStylePreset(websitePreset);
        publishSharedInterfaceStylePreset(interfacePreset);
        for (const [key, value] of Object.entries(websiteVariables)) document.body.style.setProperty(key, value);
        for (const [key, value] of Object.entries(interfaceVariables)) document.body.style.setProperty(key, value);
        document.body.style.setProperty("--studio-workspace-background", interfaceVariables["--acm-ui-color-workspace-background"]);
        document.body.style.setProperty("--studio-selection-colour", interfaceVariables["--acm-ui-color-selection"]);
        document.body.style.setProperty("--studio-range-accent", interfaceVariables["--acm-ui-color-control-accent"]);
        document.body.style.setProperty("--studio-range-hover-accent", interfaceVariables["--acm-ui-color-control-hover"]);
        document.body.style.setProperty("--studio-range-pressed-accent", interfaceVariables["--acm-ui-color-control-pressed"]);
        for (const key of ["background", "foreground", "border", "hover-background", "hover-foreground"]) {
          document.body.style.setProperty(`--studio-shared-button-${key}`, interfaceVariables[`--acm-ui-button-base-${key}`]);
        }
      } catch { /* Local refresh failures leave the last parsed guide active. */ }
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
