import type { Metadata } from "next";
import { ParagraphBlockCatalogue } from "./paragraph-block-catalogue";
import "../catalogue.css";
import "../../controls/catalogue.css";

export const metadata: Metadata = { title: "Paragraph · Studio UI Library", description: "Inspect the Paragraph block definition, real inspector, dependencies and editing example." };

export default function StudioUiParagraphBlockPage() { return <ParagraphBlockCatalogue />; }
