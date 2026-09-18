import type { Metadata } from "next";
import { RibbonCatalogue } from "./ribbon-catalogue";

export const metadata: Metadata = { title: "Ribbon Library", description: "Inspect ACM Ribbon components and original SVG symbols." };

export default function RibbonLibraryPage() {
  return <RibbonCatalogue />;
}
