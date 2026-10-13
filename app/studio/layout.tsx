import type { ReactNode } from "react";
import { MediaRuntime } from "./media-runtime";
import { DesignBrokerRuntime } from "./design-broker-runtime";
import { StudioFocusOutlineProvider } from "./focus-outline-preferences";
import { LocalSiteBrokerRuntime } from "./test-site/broker-runtime";

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <StudioFocusOutlineProvider><DesignBrokerRuntime /><MediaRuntime /><LocalSiteBrokerRuntime />{children}</StudioFocusOutlineProvider>;
}
