import type { Metadata } from "next";
import { PanelCatalogue } from "./panel-catalogue";
import "@acm/panel/styles.css";
import "./panel-catalogue.css";

export const metadata: Metadata = {
  title: "Panels · Studio UI Library",
  description: "Explore the shared ACM card panel and its content slots.",
};

export default function StudioUiPanelsPage() {
  return <PanelCatalogue />;
}
