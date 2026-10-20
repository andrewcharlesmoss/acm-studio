"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { StyleViewport } from "../content/responsive-styles";
const ResponsiveStyleContext = createContext({ enabled: false, viewport: "desktop" as StyleViewport, editingViewport: "desktop" as StyleViewport, setEnabled: (() => {}) as (enabled: boolean) => void });
export function ResponsiveStyleProvider({ viewport, initialEnabled = false, children }: { viewport: StyleViewport; initialEnabled?: boolean; children: ReactNode }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  return <ResponsiveStyleContext.Provider value={{ enabled, viewport, editingViewport: enabled ? viewport : "desktop", setEnabled }}>{children}</ResponsiveStyleContext.Provider>;
}
export const useResponsiveStyleScope = () => useContext(ResponsiveStyleContext);
