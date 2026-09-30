import type { Metadata } from "next";
import { BlockLibraryCatalogue } from "../block-specimen-catalogue";
import "../../catalogue-navigation.css";
import "../catalogue.css";

export const metadata: Metadata = { title: "Paragraph · Studio UI Library", description: "Inspect the Paragraph block profile, production inspector, dependencies and isolated editing example." };

export default function StudioUiParagraphBlockPage() { return <BlockLibraryCatalogue initialType="paragraph" />; }
