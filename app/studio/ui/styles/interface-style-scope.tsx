"use client";

import { createContext, useContext, type ReactNode } from "react";
import { interfaceStylePresetToCssVariables, type InterfaceStylePreset } from "@acm/styles";

const InterfaceStyleScopeContext = createContext<InterfaceStylePreset | null>(null);

export function InterfaceStyleScope({ preset, children }: { preset: InterfaceStylePreset; children: ReactNode }) {
  return <InterfaceStyleScopeContext.Provider value={preset}>{children}</InterfaceStyleScopeContext.Provider>;
}

/** Portalled controls inherit the same temporary or saved values as their trigger. */
export function useInterfaceStylePortalStyle() {
  const preset = useContext(InterfaceStyleScopeContext);
  return preset ? interfaceStylePresetToCssVariables(preset) : undefined;
}
