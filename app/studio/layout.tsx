import type { ReactNode } from "react";
import { StudioFocusOutlineProvider } from "./focus-outline-preferences";

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <StudioFocusOutlineProvider>{children}</StudioFocusOutlineProvider>;
}
