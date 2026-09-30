import type { Metadata } from "next";
import { BlockLibraryCatalogue } from "./block-specimen-catalogue";
import { StudioUiLibrary } from "../studio-ui-library";
import "../catalogue-navigation.css";
import "./catalogue.css";

export const metadata: Metadata = { title: "Blocks · Studio UI Library", description: "Browse documented ACM Studio block definitions and interactive specimens." };

export default function StudioUiBlocksPage() {
  return <BlockLibraryCatalogue initialType={null} />;
}
