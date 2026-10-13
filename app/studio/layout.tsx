import type { ReactNode } from "react";
import { MediaRuntime } from "./media-runtime";
import { DesignBrokerRuntime } from "./design-broker-runtime";
import { StudioFocusOutlineProvider } from "./focus-outline-preferences";

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <StudioFocusOutlineProvider><DesignBrokerRuntime /><MediaRuntime />{children}</StudioFocusOutlineProvider>;
}
