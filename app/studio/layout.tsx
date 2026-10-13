import type { ReactNode } from "react";
import { DesignBrokerRuntime } from "./design-broker-runtime";
import { StudioFocusOutlineProvider } from "./focus-outline-preferences";

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <StudioFocusOutlineProvider><DesignBrokerRuntime />{children}</StudioFocusOutlineProvider>;
}
