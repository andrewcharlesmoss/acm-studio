import type { ReactNode } from "react";
import { StudioFocusOutlineProvider } from "./focus-outline-preferences";
import { StudioAccordionAppearanceProvider } from "./accordion-appearance";

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <StudioFocusOutlineProvider><StudioAccordionAppearanceProvider>{children}</StudioAccordionAppearanceProvider></StudioFocusOutlineProvider>;
}
