"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ProjectLocalLinksProvider, SitesDisclosureProvider } from "./project-local-links";

export function NavigationContinuityProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname !== "/studio" && pathname !== "/studio/site-editor") return children;
  return <SitesDisclosureProvider><ProjectLocalLinksProvider>{children}</ProjectLocalLinksProvider></SitesDisclosureProvider>;
}
